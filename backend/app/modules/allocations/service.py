import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.allocations.model import AllocationStatusEnum, SectorAllocation
from app.modules.allocations.repository import allocation_repository
from app.modules.allocations.schema import AllocationCreate, AllocationStatusUpdate
from app.modules.notifications.service import notification_service
from app.modules.projects.model import Project, ProjectStatusEnum
from app.modules.projects.repository import project_repository
from app.modules.sectors.model import Sector, SectorStatusEnum
from app.modules.sectors.repository import sector_repository
from app.modules.timeline.service import timeline_service
from app.modules.users.model import RoleEnum, User
from app.modules.users.repository import user_repository


class AllocationService:
    """Business logic for pilot and drone allocation and field execution updates."""

    async def allocate_sector(
        self,
        db: AsyncSession,
        current_user: User,
        sector_id: uuid.UUID,
        alloc_in: AllocationCreate,
    ) -> SectorAllocation:
        # 1. RBAC Guard: Admin or Operations only
        if current_user.role not in [RoleEnum.ADMIN, RoleEnum.OPERATIONS]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Admin or Operations personnel can assign pilots and hardware",
            )

        # 2. Fetch Sector
        sector = await sector_repository.get_by_id(db, sector_id)
        if not sector:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sector not found")

        # 3. Fetch Parent Project & Enforce Approval Guard
        project = await project_repository.get_by_id(db, sector.project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent project not found")

        if project.status not in [ProjectStatusEnum.APPROVED, ProjectStatusEnum.ACTIVE]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot allocate pilot to sector: project is in '{project.status.value}' state. Plan must be approved first.",
            )

        # 4. Verify Assigned Pilot exists and has PILOT role
        pilot = await user_repository.get_by_id(db, alloc_in.pilot_id)
        if not pilot or pilot.role != RoleEnum.PILOT or not pilot.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected user is not a valid active pilot",
            )

        # 5. Handle existing active allocation for this sector (reassign)
        active_alloc = await allocation_repository.get_active_by_sector(db, sector_id)
        if active_alloc:
            await allocation_repository.update_status(db, active_alloc, AllocationStatusEnum.REASSIGNED)

        # 6. Create new Allocation
        allocation = await allocation_repository.create_allocation(
            db=db,
            sector_id=sector.id,
            project_id=project.id,
            pilot_id=pilot.id,
            drone_model=alloc_in.drone_model,
            drone_serial_number=alloc_in.drone_serial_number,
            assigned_by=current_user.id,
        )

        # 7. Transition Project to ACTIVE if it was APPROVED
        if project.status == ProjectStatusEnum.APPROVED:
            await project_repository.update(db=db, project=project, status=ProjectStatusEnum.ACTIVE)

        # 8. Log Timeline Event
        await timeline_service.log_event(
            db=db,
            category="allocation",
            action="pilot_allocated",
            message=f"Allocated Pilot {pilot.email} ({alloc_in.drone_model}) to Sector {sector.sector_code}",
            project_id=project.id,
            user_id=current_user.id,
            metadata={
                "allocation_id": str(allocation.id),
                "sector_id": str(sector.id),
                "sector_code": sector.sector_code,
                "pilot_id": str(pilot.id),
                "drone_model": alloc_in.drone_model,
            },
        )

        # 9. Send Push and Email Alerts to Pilot
        await notification_service.send_email(
            to_email=pilot.email,
            subject=f"New Flight Sector Assigned: {sector.sector_code} ({project.title})",
            html_content=f"<p>You have been assigned to survey <b>Sector {sector.sector_code}</b> for project <b>{project.title}</b> with drone {alloc_in.drone_model}.</p>",
        )
        if pilot.device_token:
            await notification_service.send_push(
                device_token=pilot.device_token,
                title=f"New Mission: Sector {sector.sector_code}",
                body=f"Assigned with {alloc_in.drone_model} for {project.title}",
                data={"sector_id": str(sector.id), "project_id": str(project.id)},
            )

        return allocation

    async def update_allocation_status(
        self,
        db: AsyncSession,
        current_user: User,
        allocation_id: uuid.UUID,
        status_in: AllocationStatusUpdate,
    ) -> SectorAllocation:
        allocation = await allocation_repository.get_by_id(db, allocation_id)
        if not allocation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Allocation not found")

        # Pilots can only update their own allocations
        if current_user.role == RoleEnum.PILOT and allocation.pilot_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your own assigned flight allocations",
            )

        old_status = allocation.status
        updated_alloc = await allocation_repository.update_status(
            db=db,
            allocation=allocation,
            new_status=status_in.status,
        )

        # Synchronize underlying Sector status
        sector = await sector_repository.get_by_id(db, allocation.sector_id)
        if sector:
            if status_in.status == AllocationStatusEnum.IN_FLIGHT:
                await sector_repository.update_status(db, sector, SectorStatusEnum.IN_PROGRESS)
            elif status_in.status == AllocationStatusEnum.COMPLETED:
                await sector_repository.update_status(db, sector, SectorStatusEnum.SURVEYED)

        # Log timeline event
        await timeline_service.log_event(
            db=db,
            category="execution",
            action="flight_status_updated",
            message=f"Flight status updated to '{status_in.status.value}' for Sector {sector.sector_code if sector else ''}",
            project_id=allocation.project_id,
            user_id=current_user.id,
            metadata={
                "allocation_id": str(allocation.id),
                "old_status": old_status.value,
                "new_status": status_in.status.value,
            },
        )

        # If completed, notify project client & ops of progress
        if status_in.status == AllocationStatusEnum.COMPLETED and sector:
            project = await project_repository.get_by_id(db, allocation.project_id)
            if project:
                client_user = await user_repository.get_by_id(db, project.client_id)
                if client_user:
                    await notification_service.send_email(
                        to_email=client_user.email,
                        subject=f"Survey Completed: Sector {sector.sector_code} ({project.title})",
                        html_content=f"<p>Aerial survey for <b>Sector {sector.sector_code}</b> of project <b>{project.title}</b> is complete and telemetry data logged.</p>",
                    )
                    if client_user.device_token:
                        await notification_service.send_push(
                            device_token=client_user.device_token,
                            title=f"Sector {sector.sector_code} Survey Complete",
                            body=f"Flight mission for Sector {sector.sector_code} in '{project.title}' is completed.",
                            data={"project_id": str(project.id), "sector_id": str(sector.id)},
                        )

        return updated_alloc

    async def list_pilot_allocations(
        self,
        db: AsyncSession,
        current_user: User,
    ) -> List[SectorAllocation]:
        if current_user.role == RoleEnum.PILOT:
            return await allocation_repository.list_by_pilot(db, current_user.id)
        # Admin or Ops can view all or filter by query
        return await allocation_repository.list_by_pilot(db, current_user.id)


allocation_service = AllocationService()
