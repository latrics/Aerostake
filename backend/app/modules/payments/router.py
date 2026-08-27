import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.payments.schema import (
    PaymentRecordCreate,
    PaymentRecordOut,
    PaymentRecordVerify,
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
    "/payments/{payment_id}/verify",
    response_model=PaymentRecordOut,
    status_code=status.HTTP_200_OK,
    summary="Verify bank payment receipt for a milestone invoice (Admin only)",
)
async def verify_payment(
    payment_id: uuid.UUID,
    verify_in: PaymentRecordVerify,
    current_user: User = Depends(require_role(RoleEnum.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Finance Admin verifies that bank wire or ACH funds have cleared in the corporate account."""
    return await payment_service.verify_payment(
        db=db,
        current_user=current_user,
        payment_id=payment_id,
        verify_in=verify_in,
    )
