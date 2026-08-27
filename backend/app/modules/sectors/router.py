import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.sectors.schema import (
    SectorBatchCreate,
    SectorOut,
    SectorStatusUpdate,
)
from app.modules.sectors.service import sector_service
from app.modules.users.model import RoleEnum, User
from app.security.auth import get_current_user
from app.security.permissions import require_role

sectors_router = APIRouter(tags=["Sectors"])


@sectors_router.post(
    "/projects/{project_id}/sectors",
    response_model=List[SectorOut],
    status_code=status.HTTP_201_CREATED,
    summary="Subdivide project plan into flight sectors (Ops/Admin only)",
)
async def create_sectors(
    project_id: uuid.UUID,
    batch_in: SectorBatchCreate,
    current_user: User = Depends(require_role(RoleEnum.ADMIN, RoleEnum.OPERATIONS)),
    db: AsyncSession = Depends(get_db),
):
    """Subdivide an approved operational plan into discrete flight grid sectors."""
    return await sector_service.create_sectors(
        db=db,
        current_user=current_user,
        project_id=project_id,
        batch_in=batch_in,
    )


@sectors_router.get(
    "/projects/{project_id}/sectors",
    response_model=List[SectorOut],
    status_code=status.HTTP_200_OK,
    summary="List all sectors for a project",
)
async def list_project_sectors(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all flight sectors for a survey project."""
    return await sector_service.list_sectors_for_project(
        db=db,
        current_user=current_user,
        project_id=project_id,
    )


@sectors_router.get(
    "/sectors/{sector_id}",
    response_model=SectorOut,
    status_code=status.HTTP_200_OK,
    summary="Get sector details by ID",
)
async def get_sector(
    sector_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve details and polygon coordinates of a specific flight sector."""
    return await sector_service.get_sector(
        db=db,
        current_user=current_user,
        sector_id=sector_id,
    )


@sectors_router.patch(
    "/sectors/{sector_id}/status",
    response_model=SectorOut,
    status_code=status.HTTP_200_OK,
    summary="Update sector survey status (Pilot/Ops/Admin)",
)
async def update_sector_status(
    sector_id: uuid.UUID,
    status_in: SectorStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update sector status (e.g. IN_PROGRESS -> SURVEYED)."""
    return await sector_service.update_sector_status(
        db=db,
        current_user=current_user,
        sector_id=sector_id,
        status_in=status_in,
    )
