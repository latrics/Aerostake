import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.modules.projects.model import ProjectStatusEnum


class ProjectCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=255, description="Project survey title")
    description: Optional[str] = Field(default=None, description="Detailed project description and scope notes")


class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=2, max_length=255)
    description: Optional[str] = None
    status: Optional[ProjectStatusEnum] = None


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: Optional[str] = None
    client_id: uuid.UUID
    status: ProjectStatusEnum
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
