import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.payments.model import Invoice, PaymentRecord, PaymentStatusEnum


class PaymentRepository:
    """Raw database operations for PaymentRecord and Invoice entities."""

    async def create(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
        milestone_name: str,
        amount_usd: float,
        payment_method: Optional[str] = None,
        reference_code: Optional[str] = None,
        notes: Optional[str] = None,
        slip_url: Optional[str] = None,
    ) -> PaymentRecord:
        record = PaymentRecord(
            project_id=project_id,
            milestone_name=milestone_name.strip(),
            amount_usd=amount_usd,
            status=PaymentStatusEnum.PENDING,
            payment_method=payment_method.strip() if payment_method else None,
            reference_code=reference_code.strip() if reference_code else None,
            notes=notes.strip() if notes else None,
            slip_url=slip_url.strip() if slip_url else None,
        )
        db.add(record)
        await db.flush()
        await db.refresh(record)
        return record

    async def get_by_id(
        self,
        db: AsyncSession,
        payment_id: uuid.UUID,
    ) -> Optional[PaymentRecord]:
        stmt = select(PaymentRecord).where(PaymentRecord.id == payment_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_project(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
    ) -> List[PaymentRecord]:
        stmt = (
            select(PaymentRecord)
            .where(PaymentRecord.project_id == project_id)
            .order_by(PaymentRecord.created_at.asc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def list_verified_by_project(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
    ) -> List[PaymentRecord]:
        stmt = (
            select(PaymentRecord)
            .where(
                PaymentRecord.project_id == project_id,
                PaymentRecord.status == PaymentStatusEnum.VERIFIED,
            )
            .order_by(PaymentRecord.created_at.asc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def verify(
        self,
        db: AsyncSession,
        payment: PaymentRecord,
        verified_by_user_id: uuid.UUID,
        reference_code: Optional[str] = None,
        notes: Optional[str] = None,
        verified_amount: Optional[float] = None,
    ) -> PaymentRecord:
        payment.status = PaymentStatusEnum.VERIFIED
        payment.verified_by = verified_by_user_id
        payment.verified_at = datetime.now(timezone.utc)
        if verified_amount is not None and verified_amount > 0:
            payment.amount_usd = float(verified_amount)
        if reference_code:
            payment.reference_code = reference_code.strip()
        if notes:
            payment.notes = f"{payment.notes}\n[Verification]: {notes.strip()}".strip() if payment.notes else notes.strip()
        await db.flush()
        await db.refresh(payment)
        return payment

    async def reject(
        self,
        db: AsyncSession,
        payment: PaymentRecord,
        notes: Optional[str] = None,
    ) -> PaymentRecord:
        payment.status = PaymentStatusEnum.REJECTED
        if notes:
            payment.notes = f"{payment.notes}\n[Rejection]: {notes.strip()}".strip() if payment.notes else notes.strip()
        await db.flush()
        await db.refresh(payment)
        return payment

    async def create_verified_payment(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
        milestone_name: str,
        amount: float,
        payment_method: Optional[str] = None,
        reference_code: Optional[str] = None,
        notes: Optional[str] = None,
        verified_by_user_id: Optional[uuid.UUID] = None,
        slip_url: Optional[str] = None,
    ) -> PaymentRecord:
        record = PaymentRecord(
            project_id=project_id,
            milestone_name=milestone_name.strip(),
            amount_usd=amount,
            status=PaymentStatusEnum.VERIFIED,
            payment_method=payment_method.strip() if payment_method else "Bank Transfer (RTGS/NEFT)",
            reference_code=reference_code.strip() if reference_code else None,
            notes=notes.strip() if notes else None,
            slip_url=slip_url.strip() if slip_url else None,
            verified_by=verified_by_user_id,
            verified_at=datetime.now(timezone.utc),
        )
        db.add(record)
        await db.flush()
        await db.refresh(record)
        return record

    # ── Invoice Operations ──

    async def get_next_invoice_number(self, db: AsyncSession) -> str:
        current_year = datetime.now(timezone.utc).year
        stmt = select(func.count(Invoice.id))
        res = await db.execute(stmt)
        count = res.scalar() or 0
        return f"INV-{current_year}-{count + 1:04d}"

    async def create_invoice(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
        client_id: Optional[uuid.UUID],
        title: str,
        bill_date: datetime,
        due_date: Optional[datetime],
        items: list,
        total_amount: float,
        notes: Optional[str],
        created_by: Optional[uuid.UUID],
        invoice_number: Optional[str] = None,
    ) -> Invoice:
        if not invoice_number:
            invoice_number = await self.get_next_invoice_number(db)
        inv = Invoice(
            invoice_number=invoice_number,
            project_id=project_id,
            client_id=client_id,
            title=title.strip() if title else "Project Survey Service Bill",
            bill_date=bill_date,
            due_date=due_date,
            items=items,
            subtotal_amount=total_amount,
            total_amount=total_amount,
            status="issued",
            notes=notes.strip() if notes else None,
            created_by=created_by,
        )
        db.add(inv)
        await db.flush()
        await db.refresh(inv)
        return inv

    async def get_invoice_by_id(
        self,
        db: AsyncSession,
        invoice_id: uuid.UUID,
    ) -> Optional[Invoice]:
        stmt = select(Invoice).where(Invoice.id == invoice_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_invoices_by_project(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
    ) -> List[Invoice]:
        stmt = (
            select(Invoice)
            .where(Invoice.project_id == project_id)
            .order_by(Invoice.bill_date.desc(), Invoice.created_at.desc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def list_invoices_by_client(
        self,
        db: AsyncSession,
        client_id: uuid.UUID,
    ) -> List[Invoice]:
        stmt = (
            select(Invoice)
            .where(Invoice.client_id == client_id)
            .order_by(Invoice.bill_date.desc(), Invoice.created_at.desc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def list_all_invoices(
        self,
        db: AsyncSession,
    ) -> List[Invoice]:
        stmt = select(Invoice).order_by(Invoice.bill_date.desc(), Invoice.created_at.desc())
        result = await db.execute(stmt)
        return list(result.scalars().all())


payment_repository = PaymentRepository()
