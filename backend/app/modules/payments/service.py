import re
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.notifications.service import notification_service
from app.modules.payments.model import Invoice, PaymentRecord, PaymentStatusEnum
from app.modules.payments.repository import payment_repository
from app.modules.payments.schema import (
    ClientPaymentProofIn,
    ClientWalletSummary,
    DateCostItem,
    DateWiseCostSummary,
    InvoiceCreate,
    PaymentRecordCreate,
    PaymentRecordVerify,
    RecordPaymentIn,
    WalletLedgerEntry,
)
from app.modules.projects.model import Project
from app.modules.projects.repository import project_repository
from app.modules.projects.service import project_service
from app.modules.timeline.service import timeline_service
from app.modules.users.model import RoleEnum, User
from app.modules.users.repository import user_repository


def parse_date(date_str: Optional[str]) -> Optional[datetime]:
    if not date_str:
        return None
    try:
        if "T" in date_str:
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        parts = [int(p) for p in date_str.split("-")]
        return datetime(parts[0], parts[1], parts[2], tzinfo=timezone.utc)
    except Exception:
        return datetime.now(timezone.utc)

def get_project_stage_info(project_status: Optional[str]) -> tuple[int, str]:
    p_status = (project_status or "").lower()
    if p_status in ["planning"]:
        return 2, "Stage 2: Planning"
    elif p_status in ["approved", "mobilising"]:
        return 3, "Stage 3: Mobilising"
    elif p_status in ["active", "capturing"]:
        return 4, "Stage 4: Capturing"
    elif p_status in ["processing"]:
        return 5, "Stage 5: Processing"
    elif p_status in ["completed", "delivered"]:
        return 6, "Stage 6: Delivered"
    return 1, "Stage 1: Request"


def extract_tenure_multiplier(tenure_str: Optional[str]) -> float:
    if not tenure_str:
        return 1.0
    match = re.search(r"(\d+(\.\d+)?)", str(tenure_str))
    if match:
        val = float(match.group(1))
        return val if val > 0 else 1.0
    return 1.0


class PaymentService:
    """Business logic for manual milestone invoice records, digital billing tool,
    cumulative client wallet, and date-wise cost ledger.
    """

    async def create_milestone_charge(
        self,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
        charge_in: PaymentRecordCreate,
    ) -> PaymentRecord:
        # 1. RBAC Guard: Admin or Operations only
        if current_user.role not in [RoleEnum.ADMIN, RoleEnum.OPERATIONS]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Admin or Operations personnel can issue milestone charges",
            )

        # 2. Fetch Project
        project = await project_repository.get_by_id(db, project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        # 3. Create PaymentRecord
        payment = await payment_repository.create(
            db=db,
            project_id=project.id,
            milestone_name=charge_in.milestone_name,
            amount_usd=charge_in.amount_usd,
            payment_method=charge_in.payment_method,
            reference_code=charge_in.reference_code,
            notes=charge_in.notes,
        )

        # 4. Log Timeline Event
        await timeline_service.log_event(
            db=db,
            category="payment",
            action="charge_created",
            message=f"Issued invoice charge of ₹{charge_in.amount_usd:,.2f} for '{charge_in.milestone_name}'",
            project_id=project.id,
            user_id=current_user.id,
            metadata={
                "payment_id": str(payment.id),
                "milestone": charge_in.milestone_name,
                "amount": charge_in.amount_usd,
            },
        )

        # 5. Notify Client
        if project.client_id:
            client_user = await user_repository.get_by_id(db, project.client_id)
            if client_user:
                await notification_service.send_email(
                    to_email=client_user.email,
                    subject=f"Milestone Invoice Issued: {project.title}",
                    html_content=f"<p>An invoice charge of <b>₹{charge_in.amount_usd:,.2f}</b> for <b>{charge_in.milestone_name}</b> has been issued for project <b>{project.title}</b>.</p>",
                )

        return payment

    async def submit_payment_proof(
        self,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
        proof_in: ClientPaymentProofIn,
    ) -> PaymentRecord:
        """Client submits payment slip/screenshot and bank UTR ID for Operations manual verification."""
        project = await project_repository.get_by_id(db, project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        ref = proof_in.reference_code.strip()
        date_str = proof_in.payment_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
        client_notes = proof_in.notes.strip() if proof_in.notes else ""
        combined_notes = f"Payment Date: {date_str}"
        if client_notes:
            combined_notes += f" | {client_notes}"

        record = await payment_repository.create(
            db=db,
            project_id=project.id,
            milestone_name=f"Remittance Slip Submitted (UTR: {ref})",
            amount_usd=float(proof_in.amount),
            payment_method=proof_in.payment_method or "Bank Transfer (RTGS/NEFT)",
            reference_code=ref,
            notes=combined_notes,
            slip_url=proof_in.slip_url,
        )

        stage_num, stage_label = get_project_stage_info(getattr(project, "status", None))
        await timeline_service.log_event(
            db=db,
            category="payment",
            action="payment_slip_uploaded",
            message=f"Payment slip of ₹{proof_in.amount:,.2f} uploaded (UTR: {ref}) for project '{project.title}'. Awaiting Operations verification.",
            project_id=project.id,
            user_id=current_user.id,
            metadata={
                "payment_id": str(record.id),
                "amount": proof_in.amount,
                "reference_code": ref,
                "stage": stage_num,
                "stage_name": stage_label,
            },
        )
        return record

    async def verify_payment(
        self,
        db: AsyncSession,
        current_user: User,
        payment_id: uuid.UUID,
        verify_in: PaymentRecordVerify,
    ) -> PaymentRecord:
        # 1. RBAC Guard: ADMIN or OPERATIONS
        if current_user.role not in [RoleEnum.ADMIN, RoleEnum.OPERATIONS]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Admin or Operations personnel can verify payment remittances",
            )

        # 2. Fetch Payment
        payment = await payment_repository.get_by_id(db, payment_id)
        if not payment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment record not found")

        # 3. Verify Payment with confirmed amount
        verified_payment = await payment_repository.verify(
            db=db,
            payment=payment,
            verified_by_user_id=current_user.id,
            reference_code=verify_in.reference_code,
            notes=verify_in.notes,
            verified_amount=verify_in.verified_amount,
        )

        # 4. Fetch Project for audit log and client notification
        project = await project_repository.get_by_id(db, payment.project_id)

        # 5. Log Timeline Event
        stage_num, stage_label = get_project_stage_info(getattr(project, "status", None) if project else None)
        await timeline_service.log_event(
            db=db,
            category="payment",
            action="payment_verified",
            message=f"Operations verified payment of ₹{payment.amount_usd:,.2f} via {payment.payment_method or 'Bank Transfer'} (UTR: {payment.reference_code or 'N/A'})",
            project_id=payment.project_id,
            user_id=current_user.id,
            metadata={
                "payment_id": str(payment.id),
                "milestone": payment.milestone_name,
                "amount": payment.amount_usd,
                "reference_code": payment.reference_code,
                "stage": stage_num,
                "stage_name": stage_label,
            },
        )

        # 6. Notify Client
        if project and project.client_id:
            client_user = await user_repository.get_by_id(db, project.client_id)
            if client_user:
                await notification_service.send_email(
                    to_email=client_user.email,
                    subject=f"Payment Receipt Confirmed: {project.title}",
                    html_content=f"<p>Your payment of <b>₹{payment.amount_usd:,.2f}</b> has been verified by Latrics Operations. Your account balance has been updated accordingly.</p>",
                )

        return verified_payment

    async def reject_payment(
        self,
        db: AsyncSession,
        current_user: User,
        payment_id: uuid.UUID,
        notes: Optional[str] = None,
    ) -> PaymentRecord:
        if current_user.role not in [RoleEnum.ADMIN, RoleEnum.OPERATIONS]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Admin or Operations personnel can reject payment remittances",
            )
        payment = await payment_repository.get_by_id(db, payment_id)
        if not payment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment record not found")

        rejected = await payment_repository.reject(db, payment, notes=notes)
        await timeline_service.log_event(
            db=db,
            category="payment",
            action="payment_rejected",
            message=f"Payment remittance '{payment.milestone_name}' was rejected by Operations: {notes or 'Transaction could not be verified'}",
            project_id=payment.project_id,
            user_id=current_user.id,
        )
        return rejected

    async def list_project_payments(
        self,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
    ) -> List[PaymentRecord]:
        await project_service.get_project(db, current_user, project_id)
        return await payment_repository.list_by_project(db, project_id)

    async def get_payment_by_id(
        self,
        db: AsyncSession,
        current_user: User,
        payment_id: uuid.UUID,
    ) -> PaymentRecord:
        payment = await payment_repository.get_by_id(db, payment_id)
        if not payment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment record not found")
        await project_service.get_project(db, current_user, payment.project_id)
        return payment

    # ── Digital Billing & Invoicing Tool ──

    async def create_digital_invoice(
        self,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
        invoice_in: InvoiceCreate,
    ) -> Invoice:
        if current_user.role not in [RoleEnum.ADMIN, RoleEnum.OPERATIONS]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Admin or Operations personnel can generate digital invoices",
            )
        project = await project_repository.get_by_id(db, project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        # Prepare line items and calculate total
        items_data = []
        calc_total = 0.0
        for item in invoice_in.items:
            unit_val = float(item.unit or 1.0)
            price_val = float(item.price or 0.0)
            mult_tenure = bool(getattr(item, "multiply_tenure", False))
            tenure_mult = extract_tenure_multiplier(item.tenure) if mult_tenure else 1.0

            if mult_tenure:
                t_price = round(unit_val * price_val * tenure_mult, 2)
            else:
                t_price = round(
                    item.total_price if (item.total_price is not None and item.total_price > 0)
                    else (unit_val * price_val),
                    2
                )
            items_data.append({
                "sl_no": item.sl_no,
                "date": item.date,
                "item_name": item.item_name,
                "unit": item.unit,
                "price": item.price,
                "tenure": item.tenure,
                "multiply_tenure": mult_tenure,
                "total_price": t_price,
            })
            calc_total += t_price

        final_total = round(invoice_in.total_amount if invoice_in.total_amount > 0 else calc_total, 2)
        bill_dt = parse_date(invoice_in.bill_date) or datetime.now(timezone.utc)
        due_dt = parse_date(invoice_in.due_date) if invoice_in.due_date else None

        invoice = await payment_repository.create_invoice(
            db=db,
            project_id=project.id,
            client_id=project.client_id,
            title=invoice_in.title or f"Survey Services Bill - {project.title}",
            bill_date=bill_dt,
            due_date=due_dt,
            items=items_data,
            total_amount=final_total,
            notes=invoice_in.notes,
            created_by=current_user.id,
        )

        # Log timeline event with accurate stage of project when invoice was created
        stage_num, stage_label = get_project_stage_info(getattr(project, "status", None))
        await timeline_service.log_event(
            db=db,
            category="payment",
            action="invoice_generated",
            message=f"Digital Invoice #{invoice.invoice_number} generated for ₹{final_total:,.2f} ({len(items_data)} items)",
            project_id=project.id,
            user_id=current_user.id,
            metadata={
                "invoice_id": str(invoice.id),
                "invoice_number": invoice.invoice_number,
                "amount": final_total,
                "items_count": len(items_data),
                "stage": stage_num,
                "stage_name": stage_label,
            },
        )

        return invoice

    async def get_invoice(
        self,
        db: AsyncSession,
        current_user: User,
        invoice_id: uuid.UUID,
    ) -> Invoice:
        invoice = await payment_repository.get_invoice_by_id(db, invoice_id)
        if not invoice:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice record not found")
        await project_service.get_project(db, current_user, invoice.project_id)
        return invoice

    async def list_project_invoices(
        self,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
    ) -> List[Invoice]:
        await project_service.get_project(db, current_user, project_id)
        return await payment_repository.list_invoices_by_project(db, project_id)

    async def record_payment(
        self,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
        payment_in: RecordPaymentIn,
    ) -> PaymentRecord:
        if current_user.role not in [RoleEnum.ADMIN, RoleEnum.OPERATIONS]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Admin or Operations personnel can record client payments",
            )
        project = await project_repository.get_by_id(db, project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        ref = payment_in.reference_code or f"REC-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}"
        notes = payment_in.notes or "Payment received and verified by Operations"
        if payment_in.payment_date:
            notes = f"Payment Date: {payment_in.payment_date} | {notes}"

        payment = await payment_repository.create_verified_payment(
            db=db,
            project_id=project.id,
            milestone_name="Payment Remittance Received",
            amount=payment_in.amount,
            payment_method=payment_in.payment_method or "Bank Transfer (RTGS/NEFT)",
            reference_code=ref,
            notes=notes,
            verified_by_user_id=current_user.id,
        )

        stage_num, stage_label = get_project_stage_info(getattr(project, "status", None))
        await timeline_service.log_event(
            db=db,
            category="payment",
            action="payment_received",
            message=f"Received payment remittance of ₹{payment_in.amount:,.2f} via {payment_in.payment_method or 'RTGS/NEFT'} (Ref: {ref})",
            project_id=project.id,
            user_id=current_user.id,
            metadata={
                "payment_id": str(payment.id),
                "amount": payment_in.amount,
                "reference_code": ref,
                "stage": stage_num,
                "stage_name": stage_label,
            },
        )

        return payment

    # ── Cumulative Wallet Logic ──

    async def get_project_wallet(
        self,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
    ) -> ClientWalletSummary:
        project = await project_repository.get_by_id(db, project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        invoices = await payment_repository.list_invoices_by_project(db, project_id)
        payments = await payment_repository.list_verified_by_project(db, project_id)

        client_user = await user_repository.get_by_id(db, project.client_id) if project.client_id else None
        client_name = getattr(client_user, 'full_name', None) or getattr(project, 'client_name', None) or "Client"
        req_payload = getattr(project, 'requirements_payload', {}) or {}
        company_name = (
            getattr(project, 'client_company', None)
            or getattr(client_user, 'company_name', None)
            or (req_payload.get("company_name") if isinstance(req_payload, dict) else None)
            or "Client Organization"
        )

        # Build chronological stream
        events = []
        for inv in invoices:
            if getattr(inv, "status", None) == "cancelled":
                continue
            dt = inv.bill_date or inv.created_at
            events.append({
                "id": str(inv.id),
                "date": dt.strftime("%Y-%m-%d") if dt else "N/A",
                "timestamp": dt,
                "type": "bill",
                "reference": inv.invoice_number,
                "description": inv.title or f"Invoice {inv.invoice_number}",
                "amount_billed": float(inv.total_amount),
                "amount_paid": 0.0,
            })

        for pay in payments:
            dt = pay.verified_at or pay.created_at
            events.append({
                "id": str(pay.id),
                "date": dt.strftime("%Y-%m-%d") if dt else "N/A",
                "timestamp": dt,
                "type": "payment",
                "reference": pay.reference_code or pay.milestone_name,
                "description": f"Payment Received ({pay.payment_method or 'RTGS/NEFT'})",
                "amount_billed": 0.0,
                "amount_paid": float(pay.amount_usd),
            })

        events.sort(key=lambda x: x["timestamp"] or datetime.min.replace(tzinfo=timezone.utc))

        ledger_entries: List[WalletLedgerEntry] = []
        running_bal = 0.0
        total_billed = 0.0
        total_paid = 0.0

        for evt in events:
            if evt["type"] == "bill":
                total_billed += evt["amount_billed"]
                running_bal += evt["amount_billed"]
            else:
                total_paid += evt["amount_paid"]
                running_bal -= evt["amount_paid"]

            running_bal = round(running_bal, 2)

            if running_bal > 0:
                bal_status = "due"
                color = "red"
            elif running_bal == 0:
                bal_status = "settled"
                color = "green"
            else:
                bal_status = "credit"
                color = "green"

            ledger_entries.append(WalletLedgerEntry(
                id=evt["id"],
                date=evt["date"],
                timestamp=evt["timestamp"].isoformat() if evt["timestamp"] else None,
                type=evt["type"],
                reference=evt["reference"],
                description=evt["description"],
                amount_billed=evt["amount_billed"],
                amount_paid=evt["amount_paid"],
                running_balance=running_bal,
                balance_status=bal_status,
                badge_color=color,
            ))

        total_billed = round(total_billed, 2)
        total_paid = round(total_paid, 2)
        current_bal = round(total_billed - total_paid, 2)

        if current_bal > 0:
            status_text = "due"
            status_label = f"₹{current_bal:,.0f} Due"
            status_color = "red"
            amount_due = current_bal
            credit_surplus = 0.0
        elif current_bal == 0:
            status_text = "settled"
            status_label = "Settled"
            status_color = "green"
            amount_due = 0.0
            credit_surplus = 0.0
        else:
            status_text = "credit"
            credit_val = abs(current_bal)
            status_label = f"₹{credit_val:,.0f} Credit"
            status_color = "green"
            amount_due = 0.0
            credit_surplus = credit_val

        return ClientWalletSummary(
            client_id=str(project.client_id) if project.client_id else None,
            client_name=client_name,
            company_name=company_name,
            project_id=str(project.id),
            project_title=project.title,
            total_billed=total_billed,
            total_paid=total_paid,
            current_balance=current_bal,
            status=status_text,
            status_label=status_label,
            status_color=status_color,
            amount_due=amount_due,
            credit_surplus=credit_surplus,
            ledger_entries=ledger_entries,
        )

    async def get_client_cumulative_wallet(
        self,
        db: AsyncSession,
        current_user: User,
    ) -> ClientWalletSummary:
        """Computes the client's continuous running balance across all their projects."""
        if current_user.role in [RoleEnum.ADMIN, RoleEnum.OPERATIONS]:
            projects = await project_repository.list_all(db, limit=200)
        elif getattr(current_user, 'organization_id', None):
            projects = await project_repository.list_by_organization(db, current_user.organization_id)
        else:
            projects = await project_repository.list_by_client(db, current_user.id)

        all_invoices = []
        all_payments = []
        for p in projects:
            p_invoices = await payment_repository.list_invoices_by_project(db, p.id)
            p_payments = await payment_repository.list_verified_by_project(db, p.id)
            all_invoices.extend(p_invoices)
            all_payments.extend(p_payments)

        events = []
        for inv in all_invoices:
            if getattr(inv, "status", None) == "cancelled":
                continue
            dt = inv.bill_date or inv.created_at
            events.append({
                "id": str(inv.id),
                "date": dt.strftime("%Y-%m-%d") if dt else "N/A",
                "timestamp": dt,
                "type": "bill",
                "reference": inv.invoice_number,
                "description": inv.title or f"Invoice {inv.invoice_number}",
                "amount_billed": float(inv.total_amount),
                "amount_paid": 0.0,
            })

        for pay in all_payments:
            dt = pay.verified_at or pay.created_at
            events.append({
                "id": str(pay.id),
                "date": dt.strftime("%Y-%m-%d") if dt else "N/A",
                "timestamp": dt,
                "type": "payment",
                "reference": pay.reference_code or pay.milestone_name,
                "description": f"Payment Received ({pay.payment_method or 'RTGS/NEFT'})",
                "amount_billed": 0.0,
                "amount_paid": float(pay.amount_usd),
            })

        events.sort(key=lambda x: x["timestamp"] or datetime.min.replace(tzinfo=timezone.utc))

        ledger_entries: List[WalletLedgerEntry] = []
        running_bal = 0.0
        total_billed = 0.0
        total_paid = 0.0

        for evt in events:
            if evt["type"] == "bill":
                total_billed += evt["amount_billed"]
                running_bal += evt["amount_billed"]
            else:
                total_paid += evt["amount_paid"]
                running_bal -= evt["amount_paid"]

            running_bal = round(running_bal, 2)
            bal_status = "due" if running_bal > 0 else ("settled" if running_bal == 0 else "credit")
            color = "red" if running_bal > 0 else "green"

            ledger_entries.append(WalletLedgerEntry(
                id=evt["id"],
                date=evt["date"],
                timestamp=evt["timestamp"].isoformat() if evt["timestamp"] else None,
                type=evt["type"],
                reference=evt["reference"],
                description=evt["description"],
                amount_billed=evt["amount_billed"],
                amount_paid=evt["amount_paid"],
                running_balance=running_bal,
                balance_status=bal_status,
                badge_color=color,
            ))

        total_billed = round(total_billed, 2)
        total_paid = round(total_paid, 2)
        current_bal = round(total_billed - total_paid, 2)

        if current_bal > 0:
            status_text = "due"
            status_label = f"₹{current_bal:,.0f} Due"
            status_color = "red"
            amount_due = current_bal
            credit_surplus = 0.0
        elif current_bal == 0:
            status_text = "settled"
            status_label = "Settled"
            status_color = "green"
            amount_due = 0.0
            credit_surplus = 0.0
        else:
            status_text = "credit"
            credit_val = abs(current_bal)
            status_label = f"₹{credit_val:,.0f} Credit"
            status_color = "green"
            amount_due = 0.0
            credit_surplus = credit_val

        company_name = getattr(current_user, 'company_name', None) or "Client Organization"
        client_name = getattr(current_user, 'full_name', None) or current_user.email

        return ClientWalletSummary(
            client_id=str(current_user.id),
            client_name=client_name,
            company_name=company_name,
            project_id=None,
            project_title="All Projects Cumulative",
            total_billed=total_billed,
            total_paid=total_paid,
            current_balance=current_bal,
            status=status_text,
            status_label=status_label,
            status_color=status_color,
            amount_due=amount_due,
            credit_surplus=credit_surplus,
            ledger_entries=ledger_entries,
        )

    # ── Date-wise Cost Ledger ──

    async def get_project_cost_ledger(
        self,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
    ) -> List[DateWiseCostSummary]:
        project = await project_repository.get_by_id(db, project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        invoices = await payment_repository.list_invoices_by_project(db, project_id)

        date_groups: Dict[str, List[DateCostItem]] = {}
        _, stage_label = get_project_stage_info(getattr(project, "status", None))

        for inv in invoices:
            if getattr(inv, "status", None) == "cancelled":
                continue
            items = inv.items if isinstance(inv.items, list) else []
            inv_ts = inv.created_at.isoformat() if getattr(inv, "created_at", None) else (inv.bill_date.isoformat() if inv.bill_date else None)
            for item in items:
                d_str = item.get("date") or (inv.bill_date.strftime("%Y-%m-%d") if inv.bill_date else "Unspecified Date")
                if d_str not in date_groups:
                    date_groups[d_str] = []
                unit_val = float(item.get("unit") or 1.0)
                price_val = float(item.get("price") or 0.0)
                tenure_str = item.get("tenure")
                mult_tenure = item.get("multiply_tenure")
                tenure_mult = extract_tenure_multiplier(tenure_str)

                if mult_tenure is True:
                    tot_val = round(unit_val * price_val * tenure_mult, 2)
                elif mult_tenure is False:
                    tot_val = round(unit_val * price_val, 2)
                else:
                    tot_val = item.get("total_price")
                    if tot_val is None or float(tot_val) <= 0:
                        tot_val = round(unit_val * price_val, 2)
                date_groups[d_str].append(DateCostItem(
                    sl_no=int(item.get("sl_no") or len(date_groups[d_str]) + 1),
                    invoice_id=str(inv.id),
                    invoice_number=inv.invoice_number,
                    project_id=str(project.id),
                    project_title=project.title,
                    item_name=item.get("item_name") or "Service Item",
                    unit=unit_val,
                    price=price_val,
                    tenure=tenure_str,
                    multiply_tenure=mult_tenure if mult_tenure is not None else None,
                    total_price=float(tot_val),
                    stage=stage_label,
                    timestamp=inv_ts,
                ))

        sorted_dates = sorted(date_groups.keys(), reverse=True)
        res = []
        for d in sorted_dates:
            itemList = date_groups[d]
            day_total = sum(i.total_price for i in itemList)
            day_ts = next((i.timestamp for i in itemList if i.timestamp), None)
            res.append(DateWiseCostSummary(
                date=d,
                items=itemList,
                day_total=round(day_total, 2),
                total_items_count=len(itemList),
                timestamp=day_ts,
            ))

        return res

    async def get_global_cost_ledger(
        self,
        db: AsyncSession,
        current_user: User,
    ) -> List[DateWiseCostSummary]:
        invoices = await payment_repository.list_all_invoices(db)

        # Project lookup cache
        proj_map: Dict[uuid.UUID, Project] = {}
        date_groups: Dict[str, List[DateCostItem]] = {}

        for inv in invoices:
            if inv.project_id not in proj_map:
                p = await project_repository.get_by_id(db, inv.project_id)
                if p:
                    proj_map[inv.project_id] = p
            p_obj = proj_map.get(inv.project_id)
            p_title = p_obj.title if p_obj else "Project"

            items = inv.items if isinstance(inv.items, list) else []
            inv_ts = inv.created_at.isoformat() if getattr(inv, "created_at", None) else (inv.bill_date.isoformat() if inv.bill_date else None)
            for item in items:
                d_str = item.get("date") or (inv.bill_date.strftime("%Y-%m-%d") if inv.bill_date else "Unspecified Date")
                if d_str not in date_groups:
                    date_groups[d_str] = []
                unit_val = float(item.get("unit") or 1.0)
                price_val = float(item.get("price") or 0.0)
                tenure_str = item.get("tenure")
                mult_tenure = item.get("multiply_tenure")
                tenure_mult = extract_tenure_multiplier(tenure_str)

                if mult_tenure is True:
                    tot_val = round(unit_val * price_val * tenure_mult, 2)
                elif mult_tenure is False:
                    tot_val = round(unit_val * price_val, 2)
                else:
                    tot_val = item.get("total_price")
                    if tot_val is None or float(tot_val) <= 0:
                        tot_val = round(unit_val * price_val, 2)

                date_groups[d_str].append(DateCostItem(
                    sl_no=int(item.get("sl_no") or len(date_groups[d_str]) + 1),
                    invoice_id=str(inv.id),
                    invoice_number=inv.invoice_number,
                    project_id=str(inv.project_id),
                    project_title=p_title,
                    item_name=item.get("item_name") or "Service Item",
                    unit=unit_val,
                    price=price_val,
                    tenure=tenure_str,
                    multiply_tenure=mult_tenure if mult_tenure is not None else None,
                    total_price=float(tot_val),
                    timestamp=inv_ts,
                ))

        sorted_dates = sorted(date_groups.keys(), reverse=True)
        res = []
        for d in sorted_dates:
            itemList = date_groups[d]
            day_total = sum(i.total_price for i in itemList)
            day_ts = next((i.timestamp for i in itemList if i.timestamp), None)
            res.append(DateWiseCostSummary(
                date=d,
                items=itemList,
                day_total=round(day_total, 2),
                total_items_count=len(itemList),
                timestamp=day_ts,
            ))

        return res


payment_service = PaymentService()
