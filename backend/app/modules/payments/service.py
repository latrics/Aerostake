import uuid
from typing import List
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.notifications.service import notification_service
from app.modules.payments.model import PaymentRecord, PaymentStatusEnum
from app.modules.payments.repository import payment_repository
from app.modules.payments.schema import PaymentRecordCreate, PaymentRecordVerify
from app.modules.projects.model import Project
from app.modules.projects.repository import project_repository
from app.modules.projects.service import project_service
from app.modules.timeline.service import timeline_service
from app.modules.users.model import RoleEnum, User
from app.modules.users.repository import user_repository


class PaymentService:
    """Business logic for manual milestone invoice records and admin bank payment verification."""

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
            message=f"Issued invoice charge of ${charge_in.amount_usd:,.2f} for '{charge_in.milestone_name}'",
            project_id=project.id,
            user_id=current_user.id,
            metadata={
                "payment_id": str(payment.id),
                "milestone": charge_in.milestone_name,
                "amount_usd": charge_in.amount_usd,
            },
        )

        # 5. Notify Client
        client_user = await user_repository.get_by_id(db, project.client_id)
        if client_user:
            await notification_service.send_email(
                to_email=client_user.email,
                subject=f"Milestone Invoice Issued: {project.title}",
                html_content=f"<p>An invoice charge of <b>${charge_in.amount_usd:,.2f}</b> for <b>{charge_in.milestone_name}</b> has been issued for project <b>{project.title}</b>.</p>",
            )

        return payment

    async def verify_payment(
        self,
        db: AsyncSession,
        current_user: User,
        payment_id: uuid.UUID,
        verify_in: PaymentRecordVerify,
    ) -> PaymentRecord:
        # 1. RBAC Guard: ADMIN ONLY
        if current_user.role != RoleEnum.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Administrators can verify bank payment remittances",
            )

        # 2. Fetch Payment
        payment = await payment_repository.get_by_id(db, payment_id)
        if not payment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment record not found")

        # 3. Verify Payment
        verified_payment = await payment_repository.verify(
            db=db,
            payment=payment,
            verified_by_user_id=current_user.id,
            reference_code=verify_in.reference_code,
            notes=verify_in.notes,
        )

        # 4. Fetch Project for audit log and client notification
        project = await project_repository.get_by_id(db, payment.project_id)

        # 5. Log Timeline Event
        await timeline_service.log_event(
            db=db,
            category="payment",
            action="payment_verified",
            message=f"Payment of ${payment.amount_usd:,.2f} verified for milestone '{payment.milestone_name}'",
            project_id=payment.project_id,
            user_id=current_user.id,
            metadata={
                "payment_id": str(payment.id),
                "milestone": payment.milestone_name,
                "amount_usd": payment.amount_usd,
                "reference_code": verify_in.reference_code,
            },
        )

        # 6. Notify Client
        if project:
            client_user = await user_repository.get_by_id(db, project.client_id)
            if client_user:
                await notification_service.send_email(
                    to_email=client_user.email,
                    subject=f"Payment Receipt Confirmed: {project.title}",
                    html_content=f"<p>Your payment of <b>${payment.amount_usd:,.2f}</b> for <b>{payment.milestone_name}</b> has been verified by accounting.</p>",
                )

        return verified_payment

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


payment_service = PaymentService()
