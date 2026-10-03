import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field
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
    planned_start_date: Optional[str] = None
    planned_end_date: Optional[str] = None
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


class SectorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    plan_id: uuid.UUID
    sector_code: str
    status: SectorStatusEnum
    polygon_coordinates: Optional[Dict[str, Any]] = None
    target_area_sqkm: Optional[float] = None
    estimated_flight_minutes: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
