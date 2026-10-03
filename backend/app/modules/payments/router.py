import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.payments.schema import (
    ClientPaymentProofIn,
    ClientWalletSummary,
    DateWiseCostSummary,
    InvoiceCreate,
    InvoiceOut,
    PaymentRecordCreate,
    PaymentRecordOut,
    PaymentRecordVerify,
    RecordPaymentIn,
)
from app.modules.payments.service import payment_service
from app.modules.users.model import RoleEnum, User
from app.security.auth import get_current_user
from app.security.permissions import require_role

payments_router = APIRouter(tags=["Payments"])


@payments_router.post(
    "/projects/{project_id}/payments",
    response_model=PaymentRecordOut,
    status_code=status.HTTP_201_CREATED,
    summary="Issue milestone invoice charge for a project (Ops/Admin only)",
)
async def create_milestone_charge(
    project_id: uuid.UUID,
    charge_in: PaymentRecordCreate,
    current_user: User = Depends(require_role(RoleEnum.ADMIN, RoleEnum.OPERATIONS)),
    db: AsyncSession = Depends(get_db),
):
    """Issue a milestone invoice record (e.g. 50% Mobilization Deposit) for a survey project."""
    return await payment_service.create_milestone_charge(
        db=db,
        current_user=current_user,
        project_id=project_id,
        charge_in=charge_in,
    )


@payments_router.get(
    "/projects/{project_id}/payments",
    response_model=List[PaymentRecordOut],
    status_code=status.HTTP_200_OK,
    summary="List all milestone charges and verification statuses for a project",
)
async def list_project_payments(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all milestone invoice and payment verification records for a project."""
    return await payment_service.list_project_payments(
        db=db,
        current_user=current_user,
        project_id=project_id,
    )


@payments_router.get(
    "/payments/my-wallet",
    response_model=ClientWalletSummary,
    status_code=status.HTTP_200_OK,
    summary="Get cumulative wallet summary for the current client across all their projects",
)
async def get_my_wallet(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns the authenticated client's continuous running wallet balance across all projects."""
    return await payment_service.get_client_cumulative_wallet(
        db=db,
        current_user=current_user,
    )


@payments_router.get(
    "/payments/cost-ledger",
    response_model=List[DateWiseCostSummary],
    status_code=status.HTTP_200_OK,
    summary="Get global date-wise cost ledger across all projects",
)
async def get_global_cost_ledger(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns global day-by-day itemized cost lists across projects."""
    return await payment_service.get_global_cost_ledger(
        db=db,
        current_user=current_user,
    )


@payments_router.get(
    "/payments/{payment_id}",
    response_model=PaymentRecordOut,
    status_code=status.HTTP_200_OK,
    summary="Get payment record details by ID",
)
async def get_payment(
    payment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve details and audit logs of a specific payment record."""
    return await payment_service.get_payment_by_id(
        db=db,
        current_user=current_user,
        payment_id=payment_id,
    )


@payments_router.post(
    "/projects/{project_id}/submit-slip",
    response_model=PaymentRecordOut,
    status_code=status.HTTP_201_CREATED,
    summary="Client uploads transaction slip / payment proof for Operations verification",
)
async def submit_payment_proof(
    project_id: uuid.UUID,
    proof_in: ClientPaymentProofIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Client submits bank transaction UTR, date, payment slip/screenshot. Saved with status pending for Ops audit."""
    return await payment_service.submit_payment_proof(
        db=db,
        current_user=current_user,
        project_id=project_id,
        proof_in=proof_in,
    )


@payments_router.post(
    "/payments/{payment_id}/verify",
    response_model=PaymentRecordOut,
    status_code=status.HTTP_200_OK,
    summary="Verify bank payment receipt and set confirmed paid amount (Ops/Admin only)",
)
async def verify_payment(
    payment_id: uuid.UUID,
    verify_in: PaymentRecordVerify,
    current_user: User = Depends(require_role(RoleEnum.ADMIN, RoleEnum.OPERATIONS)),
    db: AsyncSession = Depends(get_db),
):
    """Ops/Admin verifies bank wire funds, sets confirmed paid amount, deducting it from client balance."""
    return await payment_service.verify_payment(
        db=db,
        current_user=current_user,
        payment_id=payment_id,
        verify_in=verify_in,
    )


@payments_router.post(
    "/payments/{payment_id}/reject",
    response_model=PaymentRecordOut,
    status_code=status.HTTP_200_OK,
    summary="Reject fraudulent or unverified payment slip (Ops/Admin only)",
)
async def reject_payment(
    payment_id: uuid.UUID,
    verify_in: PaymentRecordVerify,
    current_user: User = Depends(require_role(RoleEnum.ADMIN, RoleEnum.OPERATIONS)),
    db: AsyncSession = Depends(get_db),
):
    """Ops/Admin marks client slip as rejected with reason notes."""
    return await payment_service.reject_payment(
        db=db,
        current_user=current_user,
        payment_id=payment_id,
        notes=verify_in.notes,
    )


# ── Digital Billing & Invoicing Tool Endpoints ──

@payments_router.post(
    "/projects/{project_id}/invoices",
    response_model=InvoiceOut,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a digital bill / invoice with itemized line costs (Ops/Admin only)",
)
async def create_digital_invoice(
    project_id: uuid.UUID,
    invoice_in: InvoiceCreate,
    current_user: User = Depends(require_role(RoleEnum.ADMIN, RoleEnum.OPERATIONS)),
    db: AsyncSession = Depends(get_db),
):
    """Ops personnel input Sl no., date, item name, unit, price, tenure, with auto-calculated totals."""
    return await payment_service.create_digital_invoice(
        db=db,
        current_user=current_user,
        project_id=project_id,
        invoice_in=invoice_in,
    )


@payments_router.get(
    "/projects/{project_id}/invoices",
    response_model=List[InvoiceOut],
    status_code=status.HTTP_200_OK,
    summary="List all digital invoices generated for a project",
)
async def list_project_invoices(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all digital invoice records generated for this survey project."""
    return await payment_service.list_project_invoices(
        db=db,
        current_user=current_user,
        project_id=project_id,
    )


@payments_router.get(
    "/invoices/{invoice_id}",
    response_model=InvoiceOut,
    status_code=status.HTTP_200_OK,
    summary="Get digital invoice details and line items by ID",
)
async def get_invoice(
    invoice_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve full line items and metadata for an invoice."""
    return await payment_service.get_invoice(
        db=db,
        current_user=current_user,
        invoice_id=invoice_id,
    )


@payments_router.post(
    "/projects/{project_id}/record-payment",
    response_model=PaymentRecordOut,
    status_code=status.HTTP_201_CREATED,
    summary="Record payment remittance received from client (Ops/Admin only)",
)
async def record_payment(
    project_id: uuid.UUID,
    payment_in: RecordPaymentIn,
    current_user: User = Depends(require_role(RoleEnum.ADMIN, RoleEnum.OPERATIONS)),
    db: AsyncSession = Depends(get_db),
):
    """Record an incoming client payment (RTGS/NEFT/Wire) that reduces the cumulative wallet balance."""
    return await payment_service.record_payment(
        db=db,
        current_user=current_user,
        project_id=project_id,
        payment_in=payment_in,
    )



@payments_router.get(
    "/projects/{project_id}/wallet",
    response_model=ClientWalletSummary,
    status_code=status.HTTP_200_OK,
    summary="Get cumulative wallet running balance and audit ledger for a project/client",
)
async def get_project_wallet(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Computes the continuous running balance (Total Billed - Total Paid) with Due/Settled/Credit status."""
    return await payment_service.get_project_wallet(
        db=db,
        current_user=current_user,
        project_id=project_id,
    )


@payments_router.get(
    "/projects/{project_id}/cost-ledger",
    response_model=List[DateWiseCostSummary],
    status_code=status.HTTP_200_OK,
    summary="Get date-wise cost ledger grouping items by date with day totals",
)
async def get_project_cost_ledger(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns day-by-day itemized cost lists, item quantities, rates, net amounts, and that day's total bill."""
    return await payment_service.get_project_cost_ledger(
        db=db,
        current_user=current_user,
        project_id=project_id,
    )



