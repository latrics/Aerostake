import uuid
from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict, Field


class RequestVersionCreate(BaseModel):
    survey_location: str = Field(..., min_length=2, max_length=255, description="Geographic location or address")
    survey_type: str = Field(..., max_length=100, description="Survey type (thermal, topography, multispectral, inspection)")
    target_area_sqkm: Optional[float] = Field(default=None, ge=0.0, description="Target surface area in square kilometers")
    requirements_payload: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Arbitrary client specifications, polygon coordinates, sensor payloads, and deliverables",
    )


class RequestVersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    version: int
    survey_location: str
    survey_type: str
    target_area_sqkm: Optional[float] = None
    requirements_payload: Optional[Dict[str, Any]] = None
    created_by: Optional[uuid.UUID] = None
    created_at: Optional[datetime] = None
    project_title: Optional[str] = None
    project_status: Optional[str] = None
    client_email: Optional[str] = None
    client_name: Optional[str] = None
    client_company: Optional[str] = None
