import uuid
from typing import List
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.planning.model import OperationalPlan, PlanStatusEnum
from app.modules.planning.repository import planning_repository
from app.modules.projects.model import Project, ProjectStatusEnum
from app.modules.projects.repository import project_repository
from app.modules.projects.service import project_service
from app.modules.sectors.model import Sector, SectorStatusEnum
from app.modules.sectors.repository import sector_repository
from app.modules.sectors.schema import SectorBatchCreate, SectorStatusUpdate
from app.modules.timeline.service import timeline_service
from app.modules.users.model import RoleEnum, User


class SectorService:
    """Business logic for flight sector creation and status tracking."""

    async def create_sectors(
        self,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
        batch_in: SectorBatchCreate,
    ) -> List[Sector]:
        # 1. RBAC Guard: Admin or Operations only
        if current_user.role not in [RoleEnum.ADMIN, RoleEnum.OPERATIONS]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Admin or Operations personnel can subdivide survey sectors",
            )

        # 2. Fetch and validate parent project
        project = await project_repository.get_by_id(db, project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        # Project must be APPROVED or ACTIVE before sectors can be assigned
        if project.status not in [ProjectStatusEnum.APPROVED, ProjectStatusEnum.ACTIVE]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot generate sectors for project in '{project.status.value}' state. Plan must be approved first.",
            )

        # 3. Fetch and validate operational plan
        plan = await planning_repository.get_by_id(db, batch_in.plan_id)
        if not plan or plan.project_id != project_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid operational plan for this project",
            )

        # 4. Create sectors
        sectors = await sector_repository.bulk_create(
            db=db,
            project_id=project_id,
            plan_id=plan.id,
            sectors_in=batch_in.sectors,
        )

        # 5. Transition Project to ACTIVE if it was APPROVED
        if project.status == ProjectStatusEnum.APPROVED:
            await project_repository.update(db=db, project=project, status=ProjectStatusEnum.ACTIVE)

        # 6. Log Timeline Event
        await timeline_service.log_event(
            db=db,
            category="allocation",
            action="sectors_created",
            message=f"Subdivided {len(sectors)} flight sectors for project '{project.title}'",
            project_id=project.id,
            user_id=current_user.id,
            metadata={"sectors_count": len(sectors), "plan_id": str(plan.id)},
        )

        return sectors

    async def get_sector(
        self,
        db: AsyncSession,
        current_user: User,
        sector_id: uuid.UUID,
    ) -> Sector:
        sector = await sector_repository.get_by_id(db, sector_id)
        if not sector:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sector not found")
        await project_service.get_project(db, current_user, sector.project_id)
        return sector

    async def list_sectors_for_project(
        self,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
    ) -> List[Sector]:
        await project_service.get_project(db, current_user, project_id)
        return await sector_repository.list_by_project(db, project_id)

    async def update_sector_status(
        self,
        db: AsyncSession,
        current_user: User,
        sector_id: uuid.UUID,
        status_in: SectorStatusUpdate,
    ) -> Sector:
        sector = await sector_repository.get_by_id(db, sector_id)
        if not sector:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sector not found")

        old_status = sector.status
        updated_sector = await sector_repository.update_status(
            db=db,
            sector=sector,
            new_status=status_in.status,
        )

        # Log timeline event
        await timeline_service.log_event(
            db=db,
            category="execution",
            action="sector_status_updated",
            message=f"Sector {sector.sector_code} survey status updated to '{status_in.status.value}'",
            project_id=sector.project_id,
            user_id=current_user.id,
            metadata={
                "sector_id": str(sector.id),
                "sector_code": sector.sector_code,
                "old_status": old_status.value,
                "new_status": status_in.status.value,
            },
        )

        return updated_sector


sector_service = SectorService()
