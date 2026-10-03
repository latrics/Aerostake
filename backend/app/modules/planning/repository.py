import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.planning.model import OperationalPlan, PlanStatusEnum, PlanningFormVersion, PlanningDraft


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

    async def get_latest_version_number(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
    ) -> int:
        stmt = (
            select(func.coalesce(func.max(PlanningFormVersion.version_number), 0))
            .where(PlanningFormVersion.project_id == project_id)
        )
        result = await db.execute(stmt)
        return int(result.scalar() or 0)

    async def get_latest_ops_version_number(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
    ) -> int:
        stmt = (
            select(func.coalesce(func.max(PlanningFormVersion.version_number), 0))
            .where(PlanningFormVersion.project_id == project_id)
            .where(PlanningFormVersion.sender == "ops")
        )
        result = await db.execute(stmt)
        return int(result.scalar() or 0)

    async def create_form_version(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
        version_number: int,
        version_code: str,
        sender: str,
        sender_name: Optional[str] = None,
        form_data: Optional[dict] = None,
        stage_threads: Optional[dict] = None,
        clarification_threads: Optional[list] = None,
        attachments: Optional[list] = None,
        status: Optional[str] = "under_review",
        created_by: Optional[uuid.UUID] = None,
    ) -> PlanningFormVersion:
        form_ver = PlanningFormVersion(
            project_id=project_id,
            version_number=version_number,
            version_code=version_code,
            sender=sender,
            sender_name=sender_name,
            form_data=form_data or {},
            stage_threads=stage_threads or {},
            clarification_threads=clarification_threads or [],
            attachments=attachments or [],
            status=status or "under_review",
            created_by=created_by,
        )
        db.add(form_ver)
        await db.flush()
        await db.refresh(form_ver)
        return form_ver

    async def list_form_versions_by_project(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
    ) -> List[PlanningFormVersion]:
        stmt = (
            select(PlanningFormVersion)
            .where(PlanningFormVersion.project_id == project_id)
            .where(PlanningFormVersion.status != "draft")
            .order_by(PlanningFormVersion.created_at.desc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_latest_form_version(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
    ) -> Optional[PlanningFormVersion]:
        stmt = (
            select(PlanningFormVersion)
            .where(PlanningFormVersion.project_id == project_id)
            .where(PlanningFormVersion.status != "draft")
            .order_by(PlanningFormVersion.created_at.desc())
        )
        result = await db.execute(stmt)
        return result.scalars().first()

    async def get_draft_by_project(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
    ) -> Optional[PlanningDraft]:
        stmt = select(PlanningDraft).where(PlanningDraft.project_id == project_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def save_or_update_draft(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
        form_data: Optional[dict] = None,
        stage_threads: Optional[dict] = None,
        clarification_threads: Optional[list] = None,
        stage_draft_saved: Optional[dict] = None,
        status: Optional[str] = None,
        updated_by: Optional[uuid.UUID] = None,
    ) -> PlanningDraft:
        draft = await self.get_draft_by_project(db, project_id)
        if not draft:
            draft = PlanningDraft(
                project_id=project_id,
                form_data=form_data or {},
                stage_threads=stage_threads or {},
                clarification_threads=clarification_threads or [],
                stage_draft_saved=stage_draft_saved or {},
                status=status or "under_review",
                updated_by=updated_by,
            )
            db.add(draft)
        else:
            if form_data is not None:
                draft.form_data = form_data
            if stage_threads is not None:
                draft.stage_threads = stage_threads
            if clarification_threads is not None:
                draft.clarification_threads = clarification_threads
            if stage_draft_saved is not None:
                draft.stage_draft_saved = stage_draft_saved
            if status is not None:
                draft.status = status
            draft.updated_by = updated_by
            draft.updated_at = datetime.now(timezone.utc)
        await db.flush()
        await db.refresh(draft)
        return draft


planning_repository = PlanningRepository()

