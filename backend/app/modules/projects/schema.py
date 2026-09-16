import uuid
from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.modules.projects.model import ProjectStatusEnum
from app.modules.requests.schema import RequestVersionOut


class ProjectCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Project survey title")
    description: Optional[str] = Field(default=None, description="Detailed project description and scope notes")
    survey_location: Optional[str] = Field(default=None, max_length=255, description="Geographic location or address")
    survey_type: Optional[str] = Field(default="topography", max_length=100, description="Survey type")
    target_area_sqkm: Optional[float] = Field(default=None, ge=0.0, description="Target surface area in square kilometers")
    requirements_payload: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Deliverables, primary & alternate contacts, dates, tenure, sensor payload, and remarks",
    )
    status: Optional[ProjectStatusEnum] = Field(default=None, description="Project status, e.g. draft")
    is_draft: Optional[bool] = Field(default=False, description="Flag indicating project should be saved in DRAFT status")


class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[ProjectStatusEnum] = None
    requirements_payload: Optional[Dict[str, Any]] = None
    survey_location: Optional[str] = None
    survey_type: Optional[str] = None
    target_area_sqkm: Optional[float] = None


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: Optional[str] = None
    client_id: uuid.UUID
    organization_id: Optional[uuid.UUID] = None
    created_by: Optional[uuid.UUID] = None
    status: ProjectStatusEnum
    latest_request: Optional[RequestVersionOut] = None
    client_email: Optional[str] = None
    client_name: Optional[str] = None
    client_company: Optional[str] = None
    creator_name: Optional[str] = None
    creator_role: Optional[str] = None
    creator_email: Optional[str] = None
    survey_location: Optional[str] = None
    survey_type: Optional[str] = None
    target_area_sqkm: Optional[float] = None
    requirements_payload: Optional[Dict[str, Any]] = None
    sectors_count: Optional[int] = 0
    completed_sectors_count: Optional[int] = 0
    progress_pct: Optional[int] = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

