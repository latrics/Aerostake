import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.payments.model import PaymentRecord, PaymentStatusEnum


class PaymentRepository:
    """Raw database operations for the PaymentRecord entity."""

    async def create(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
        milestone_name: str,
        amount_usd: float,
        payment_method: Optional[str] = None,
        reference_code: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> PaymentRecord:
        record = PaymentRecord(
            project_id=project_id,
            milestone_name=milestone_name.strip(),
            amount_usd=amount_usd,
            status=PaymentStatusEnum.PENDING,
            payment_method=payment_method.strip() if payment_method else None,
            reference_code=reference_code.strip() if reference_code else None,
            notes=notes.strip() if notes else None,
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

    async def verify(
        self,
        db: AsyncSession,
        payment: PaymentRecord,
        verified_by_user_id: uuid.UUID,
        reference_code: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> PaymentRecord:
        payment.status = PaymentStatusEnum.VERIFIED
        payment.verified_by = verified_by_user_id
        payment.verified_at = datetime.now(timezone.utc)
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


payment_repository = PaymentRepository()
