import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.planning.model import OperationalPlan, PlanStatusEnum


class PlanningRepository:
    """Raw database queries for the OperationalPlan entity."""

    async def create_plan(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
        request_version_id: uuid.UUID,
        estimated_flight_hours: float,
        required_pilots_count: int,
        required_drones_count: int,
        estimated_cost_usd: float,
        flight_strategy_notes: Optional[str] = None,
    ) -> OperationalPlan:
        plan = OperationalPlan(
            project_id=project_id,
            request_version_id=request_version_id,
            status=PlanStatusEnum.DRAFT,
            estimated_flight_hours=estimated_flight_hours,
            required_pilots_count=required_pilots_count,
            required_drones_count=required_drones_count,
            estimated_cost_usd=estimated_cost_usd,
            flight_strategy_notes=flight_strategy_notes.strip() if flight_strategy_notes else None,
        )
        db.add(plan)
        await db.flush()
        await db.refresh(plan)
        return plan

    async def get_by_id(
        self,
        db: AsyncSession,
        plan_id: uuid.UUID,
    ) -> Optional[OperationalPlan]:
        stmt = select(OperationalPlan).where(OperationalPlan.id == plan_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_plan_by_request_version(
        self,
        db: AsyncSession,
        request_version_id: uuid.UUID,
    ) -> Optional[OperationalPlan]:
        stmt = select(OperationalPlan).where(
            OperationalPlan.request_version_id == request_version_id
        ).order_by(OperationalPlan.created_at.desc())
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_active_plan_for_project(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
    ) -> Optional[OperationalPlan]:
        stmt = (
            select(OperationalPlan)
            .where(
                OperationalPlan.project_id == project_id,
                OperationalPlan.status == PlanStatusEnum.PUBLISHED,
            )
            .order_by(OperationalPlan.created_at.desc())
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_project(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
    ) -> List[OperationalPlan]:
        stmt = (
            select(OperationalPlan)
            .where(OperationalPlan.project_id == project_id)
            .order_by(OperationalPlan.created_at.desc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def publish_plan(
        self,
        db: AsyncSession,
        plan: OperationalPlan,
        published_by_user_id: uuid.UUID,
    ) -> OperationalPlan:
        plan.status = PlanStatusEnum.PUBLISHED
        plan.published_by = published_by_user_id
        plan.published_at = datetime.now(timezone.utc)
        await db.flush()
        await db.refresh(plan)
        return plan

    async def update_status(
        self,
        db: AsyncSession,
        plan: OperationalPlan,
        new_status: PlanStatusEnum,
    ) -> OperationalPlan:
        plan.status = new_status
        await db.flush()
        await db.refresh(plan)
        return plan


planning_repository = PlanningRepository()
