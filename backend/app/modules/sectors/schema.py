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
