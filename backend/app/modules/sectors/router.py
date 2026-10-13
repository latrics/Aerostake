import uuid
from typing import List
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.sectors.schema import (
    SectorBatchCreate,
    SectorOut,
    SectorStatusUpdate,
    SectorPlanningUpdate,
    SectorDailyLogCreate,
    BatchAssignPilotsRequest,
    BatchScheduleDatesRequest,
)
from app.modules.sectors.service import sector_service
from app.modules.users.model import RoleEnum, User
from app.security.auth import get_current_user
from app.security.permissions import require_role

sectors_router = APIRouter(tags=["Sectors"])


@sectors_router.post(
    "/projects/{project_id}/sectors/upload-kml",
    response_model=List[SectorOut],
    status_code=status.HTTP_201_CREATED,
    summary="Upload sectorised KML/KMZ flight plan (Ops/Admin only)",
)
async def upload_sector_kml(
    project_id: uuid.UUID,
    file: UploadFile = File(..., description="Operational sectorised .kml or .kmz file"),
    current_user: User = Depends(require_role(RoleEnum.ADMIN, RoleEnum.OPERATIONS)),
    db: AsyncSession = Depends(get_db),
):
    """Ingest sectorised KML/KMZ file, extract placemark polygons, calculate geodetic areas, and persist database sectors."""
    filename = file.filename or "sectors.kml"
    if not (filename.lower().endswith(".kml") or filename.lower().endswith(".kmz")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .kml and .kmz files are supported for operational sector plans.",
        )
    file_bytes = await file.read()
    return await sector_service.upload_sector_kml(
        db=db,
        current_user=current_user,
        project_id=project_id,
        file_bytes=file_bytes,
        filename=filename,
    )


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
    "/sectors/pilot/assigned",
    status_code=status.HTTP_200_OK,
    summary="List sectors allocated to pilot or all scheduled sectors (Pilot/Ops/Admin)",
)
async def list_assigned_sectors(
    pilot_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all sectors assigned to the current pilot (or all pilots if Ops/Admin)."""
    return await sector_service.list_assigned_sectors(
        db=db,
        current_user=current_user,
        pilot_id=pilot_id,
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


@sectors_router.patch(
    "/sectors/{sector_id}/planning",
    response_model=SectorOut,
    status_code=status.HTTP_200_OK,
    summary="Update sector planning parameters (Ops/Admin only)",
)
async def update_sector_planning(
    sector_id: uuid.UUID,
    planning_in: SectorPlanningUpdate,
    current_user: User = Depends(require_role(RoleEnum.ADMIN, RoleEnum.OPERATIONS)),
    db: AsyncSession = Depends(get_db),
):
    """Form A: Configure/override sector planning parameters (sorties, dates, pilot, equipment, etc)."""
    return await sector_service.update_sector_planning(
        db=db,
        current_user=current_user,
        sector_id=sector_id,
        planning_in=planning_in,
    )


@sectors_router.patch(
    "/projects/{project_id}/sectors/batch-assign-pilots",
    response_model=List[SectorOut],
    status_code=status.HTTP_200_OK,
    summary="Batch assign multiple sectors to a registered or invited pilot (Ops/Admin only)",
)
async def batch_assign_pilots(
    project_id: uuid.UUID,
    batch_in: BatchAssignPilotsRequest,
    current_user: User = Depends(require_role(RoleEnum.ADMIN, RoleEnum.OPERATIONS)),
    db: AsyncSession = Depends(get_db),
):
    """Batch allocate flight sectors to a pilot and update project flight roster."""
    return await sector_service.batch_assign_pilots(
        db=db,
        current_user=current_user,
        project_id=project_id,
        batch_in=batch_in,
    )


@sectors_router.patch(
    "/projects/{project_id}/sectors/batch-schedule-dates",
    response_model=List[SectorOut],
    status_code=status.HTTP_200_OK,
    summary="Batch schedule scanning dates for multiple sectors independently (Ops/Admin only)",
)
async def batch_schedule_dates(
    project_id: uuid.UUID,
    schedule_in: BatchScheduleDatesRequest,
    current_user: User = Depends(require_role(RoleEnum.ADMIN, RoleEnum.OPERATIONS)),
    db: AsyncSession = Depends(get_db),
):
    """Batch configure sector scanning dates without requiring pilot assignment."""
    return await sector_service.batch_schedule_dates(
        db=db,
        current_user=current_user,
        project_id=project_id,
        schedule_in=schedule_in,
    )



@sectors_router.post(
    "/sectors/{sector_id}/daily-logs",
    response_model=SectorOut,
    status_code=status.HTTP_200_OK,
    summary="Record daily flight status and sorties (Pilot/Ops/Admin)",
)
async def add_sector_daily_log(
    sector_id: uuid.UUID,
    log_in: SectorDailyLogCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Form B: Log daily flight sorties, hours, area, weather, remarks, and status."""
    return await sector_service.add_sector_daily_log(
        db=db,
        current_user=current_user,
        sector_id=sector_id,
        log_in=log_in,
    )
