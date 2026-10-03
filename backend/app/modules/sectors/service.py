import uuid
from datetime import datetime, timezone
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
from app.modules.sectors.schema import SectorBatchCreate, SectorStatusUpdate, SectorPlanningUpdate, SectorDailyLogCreate
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

    async def update_sector_planning(
        self,
        db: AsyncSession,
        current_user: User,
        sector_id: uuid.UUID,
        planning_in: SectorPlanningUpdate,
    ) -> Sector:
        sector = await sector_repository.get_by_id(db, sector_id)
        if not sector:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sector not found")

        # RBAC: Ops and Admin only
        if current_user.role not in [RoleEnum.ADMIN, RoleEnum.OPERATIONS]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only LATRICS Operations or Administrator can define sector planning parameters",
            )

        # Lifecycle check: cannot modify if project is completed or cancelled
        project = await project_repository.get_by_id(db, sector.project_id)
        if not project or project.status in [ProjectStatusEnum.COMPLETED, ProjectStatusEnum.CANCELLED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sector planning parameters cannot be modified on a completed or cancelled project",
            )

        if planning_in.sector_code is not None and planning_in.sector_code.strip():
            sector.sector_code = planning_in.sector_code.strip()
        if planning_in.target_area_sqkm is not None:
            sector.target_area_sqkm = planning_in.target_area_sqkm

        coords = dict(sector.polygon_coordinates or {})
        planning_data = dict(coords.get("planning") or {})

        if planning_in.sector_code is not None:
            planning_data["sector_name"] = planning_in.sector_code.strip()
        if planning_in.target_area_sqkm is not None:
            planning_data["target_area_sqkm"] = planning_in.target_area_sqkm
        if planning_in.planned_sorties is not None:
            planning_data["planned_sorties"] = planning_in.planned_sorties
        if planning_in.planned_start_date is not None:
            planning_data["planned_start_date"] = planning_in.planned_start_date
        if planning_in.planned_end_date is not None:
            planning_data["planned_end_date"] = planning_in.planned_end_date
        if planning_in.assigned_pilots is not None:
            planning_data["assigned_pilots"] = planning_in.assigned_pilots
        if planning_in.assigned_drone is not None:
            planning_data["assigned_drone"] = planning_in.assigned_drone
        if planning_in.priority is not None:
            planning_data["priority"] = planning_in.priority
        if planning_in.terrain_note is not None:
            planning_data["terrain_note"] = planning_in.terrain_note
        if planning_in.planning_remarks is not None:
            planning_data["planning_remarks"] = planning_in.planning_remarks

        planning_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        planning_data["updated_by"] = current_user.full_name or current_user.email

        coords["planning"] = planning_data
        sector.polygon_coordinates = coords
        await db.commit()
        await db.refresh(sector)

        await timeline_service.log_event(
            db=db,
            category="execution",
            action="sector_planning_configured",
            message=f"Ops defined planning parameters for Sector {sector.sector_code}",
            project_id=sector.project_id,
            user_id=current_user.id,
            metadata={"sector_id": str(sector.id), "sector_code": sector.sector_code},
        )
        return sector

    async def add_sector_daily_log(
        self,
        db: AsyncSession,
        current_user: User,
        sector_id: uuid.UUID,
        log_in: SectorDailyLogCreate,
    ) -> Sector:
        sector = await sector_repository.get_by_id(db, sector_id)
        if not sector:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sector not found")

        # 1. RBAC Guard: Pilot ONLY
        if current_user.role != RoleEnum.PILOT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only assigned Pilots can access and submit the Daily Status Update Form",
            )

        # 2. Check project lifecycle: cannot log if project is completed or cancelled
        project = await project_repository.get_by_id(db, sector.project_id)
        if not project or project.status in [ProjectStatusEnum.COMPLETED, ProjectStatusEnum.CANCELLED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Daily flight logs cannot be submitted on a completed or cancelled project",
            )

        coords = dict(sector.polygon_coordinates or {})
        flight_logs = list(coords.get("flight_logs") or [])

        now_iso = datetime.now(timezone.utc).isoformat()
        log_entry = {
            "id": str(uuid.uuid4()),
            "timestamp": now_iso,
            "date": log_in.date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "landings_today": log_in.landings_today,
            "flight_start_time": log_in.flight_start_time,
            "flight_end_time": log_in.flight_end_time,
            "area_covered_today": log_in.area_covered_today or 0.0,
            "sector_status": log_in.sector_status.value if log_in.sector_status else sector.status.value,
            "weather_condition": log_in.weather_condition or "Clear",
            "remarks": log_in.remarks or "",
            "logged_by": current_user.full_name or current_user.email,
            "logged_by_role": current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role),
        }
        flight_logs.append(log_entry)
        coords["flight_logs"] = flight_logs

        # Auto-update status if specified
        if log_in.sector_status:
            sector.status = log_in.sector_status
        elif sector.status == SectorStatusEnum.PENDING:
            sector.status = SectorStatusEnum.IN_PROGRESS

        sector.polygon_coordinates = coords
        await db.commit()
        await db.refresh(sector)

        await timeline_service.log_event(
            db=db,
            category="execution",
            action="sector_flight_log_recorded",
            message=f"Pilot {current_user.full_name or current_user.email} logged {log_in.landings_today} landings for Sector {sector.sector_code} ({log_in.weather_condition or 'Clear'})",
            project_id=sector.project_id,
            user_id=current_user.id,
            metadata={
                "sector_id": str(sector.id),
                "sector_code": sector.sector_code,
                "landings_today": log_in.landings_today,
                "area_covered_today": log_in.area_covered_today,
                "weather": log_in.weather_condition,
            },
        )
        return sector


sector_service = SectorService()
