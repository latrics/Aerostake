import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.allocations.schema import (
    AllocationCreate,
    AllocationOut,
    AllocationStatusUpdate,
)
from app.modules.allocations.service import allocation_service
from app.modules.users.model import RoleEnum, User
from app.security.auth import get_current_user
from app.security.permissions import require_role

allocations_router = APIRouter(tags=["Allocations"])


@allocations_router.post(
    "/sectors/{sector_id}/allocations",
    response_model=AllocationOut,
    status_code=status.HTTP_201_CREATED,
    summary="Assign pilot and drone hardware to a sector (Ops/Admin only)",
)
async def allocate_sector(
    sector_id: uuid.UUID,
    alloc_in: AllocationCreate,
    current_user: User = Depends(require_role(RoleEnum.ADMIN, RoleEnum.OPERATIONS)),
    db: AsyncSession = Depends(get_db),
):
    """Assign a licensed pilot and drone hardware to an approved sector."""
    return await allocation_service.allocate_sector(
        db=db,
        current_user=current_user,
        sector_id=sector_id,
        alloc_in=alloc_in,
    )


@allocations_router.get(
    "/pilots/me/allocations",
    response_model=List[AllocationOut],
    status_code=status.HTTP_200_OK,
    summary="List all sector allocations assigned to the current pilot",
)
async def get_my_allocations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all flight allocations assigned to the logged-in pilot."""
    return await allocation_service.list_pilot_allocations(
        db=db,
        current_user=current_user,
    )


@allocations_router.patch(
    "/allocations/{allocation_id}/status",
    response_model=AllocationOut,
    status_code=status.HTTP_200_OK,
    summary="Update allocation flight status (Pilot/Ops/Admin)",
)
async def update_allocation_status(
    allocation_id: uuid.UUID,
    status_in: AllocationStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update pilot flight progress (e.g. ASSIGNED -> IN_FLIGHT -> COMPLETED)."""
    return await allocation_service.update_allocation_status(
        db=db,
        current_user=current_user,
        allocation_id=allocation_id,
        status_in=status_in,
    )


@allocations_router.get(
    "/projects/{project_id}/allocations",
    response_model=List[AllocationOut],
    status_code=status.HTTP_200_OK,
    summary="List all sector flight allocations for a project",
)
async def get_project_allocations(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all flight allocations for the specified project."""
    return await allocation_service.list_project_allocations(
        db=db,
        project_id=project_id,
        current_user=current_user,
    )
