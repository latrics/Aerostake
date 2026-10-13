import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.modules.sectors.model import SectorStatusEnum


class SectorCreate(BaseModel):
    sector_code: str = Field(..., min_length=2, max_length=50, description="Grid code (e.g. SEC-A1)")
    polygon_coordinates: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="GeoJSON geometry polygon coordinates defining boundary",
    )
    target_area_sqkm: Optional[float] = Field(default=None, ge=0.0)
    estimated_flight_minutes: Optional[int] = Field(default=None, ge=1)


class SectorBatchCreate(BaseModel):
    plan_id: uuid.UUID = Field(..., description="Approved operational plan ID to attach sectors to")
    sectors: List[SectorCreate] = Field(..., min_length=1, description="List of sector grid subdivisions")


class SectorStatusUpdate(BaseModel):
    status: SectorStatusEnum = Field(..., description="Updated sector survey status")


class SectorPlanningUpdate(BaseModel):
    sector_code: Optional[str] = Field(default=None, min_length=1, max_length=50)
    target_area_sqkm: Optional[float] = Field(default=None, ge=0.0)
    planned_sorties: Optional[int] = Field(default=None, ge=0)
    scanning_date: Optional[str] = None
    planned_start_date: Optional[str] = None
    planned_end_date: Optional[str] = None
    assigned_pilot: Optional[str] = None
    assigned_pilot_id: Optional[str] = None
    pilot_email: Optional[str] = None
    pilot_phone: Optional[str] = None
    is_pending_invite: Optional[bool] = None
    assigned_pilots: Optional[List[Any]] = None
    assigned_drone: Optional[str] = None
    priority: Optional[str] = None
    terrain_note: Optional[str] = None
    planning_remarks: Optional[str] = None


class SectorDailyLogCreate(BaseModel):
    date: Optional[str] = None
    landings_today: int = Field(default=0, ge=0)
    flight_start_time: Optional[str] = None
    flight_end_time: Optional[str] = None
    area_covered_today: Optional[float] = Field(default=0.0, ge=0.0)
    sector_status: Optional[SectorStatusEnum] = None
    weather_condition: Optional[str] = None
    remarks: Optional[str] = None

    @field_validator("sector_status", mode="before")
    @classmethod
    def normalize_sector_status(cls, v: Any) -> Any:
        if v is None or v == "":
            return None
        if isinstance(v, str):
            v_norm = v.strip().lower()
            if v_norm in ("completed", "surveyed", "complete", "finished"):
                return SectorStatusEnum.SURVEYED
            elif v_norm in ("in_progress", "inprogress", "in-progress", "ongoing"):
                return SectorStatusEnum.IN_PROGRESS
            elif v_norm in ("pending", "scheduled"):
                return SectorStatusEnum.PENDING
            elif v_norm in ("flagged", "issue", "aborted", "failed"):
                return SectorStatusEnum.FLAGGED
            elif v_norm in ("verified", "approved"):
                return SectorStatusEnum.VERIFIED
        return v

    @field_validator("area_covered_today", mode="before")
    @classmethod
    def normalize_area_covered(cls, v: Any) -> Optional[float]:
        if v is None or v == "":
            return 0.0
        try:
            val = float(v)
            return max(0.0, val)
        except (ValueError, TypeError):
            return 0.0

    @field_validator("landings_today", mode="before")
    @classmethod
    def normalize_landings(cls, v: Any) -> int:
        if v is None or v == "":
            return 0
        try:
            return max(0, int(v))
        except (ValueError, TypeError):
            return 0


class SectorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    plan_id: Optional[uuid.UUID] = None
    sector_code: str
    status: SectorStatusEnum
    polygon_coordinates: Optional[Dict[str, Any]] = None
    target_area_sqkm: Optional[float] = None
    estimated_flight_minutes: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class BatchAssignPilotsRequest(BaseModel):
    sector_ids: List[uuid.UUID] = Field(..., min_length=1, description="List of sector IDs to assign")
    pilot_name: Optional[str] = Field(None, description="Name of assigned pilot")
    pilot_id: Optional[str] = None
    pilot_email: Optional[str] = None
    pilot_phone: Optional[str] = None
    is_pending_invite: Optional[bool] = False
    scanning_date: Optional[str] = Field(None, description="Default or common scanning date (YYYY-MM-DD)")
    sector_scanning_dates: Optional[Dict[str, str]] = Field(
        default_factory=dict,
        description="Per-sector scanning date map: { sector_id_str: YYYY-MM-DD }",
    )


class BatchScheduleDatesRequest(BaseModel):
    sector_ids: List[uuid.UUID] = Field(..., min_length=1, description="List of sector IDs to schedule")
    scanning_date: Optional[str] = Field(None, description="Default or common scanning date (YYYY-MM-DD)")
    sector_scanning_dates: Optional[Dict[str, str]] = Field(
        default_factory=dict,
        description="Per-sector scanning date map: { sector_id_str: YYYY-MM-DD }",
    )

