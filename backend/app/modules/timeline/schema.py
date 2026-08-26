import uuid
from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict, Field


class TimelineEventCreate(BaseModel):
    project_id: Optional[uuid.UUID] = Field(default=None, description="Associated project UUID")
    user_id: Optional[uuid.UUID] = Field(default=None, description="Actor/author user UUID")
    category: str = Field(..., description="Event category (auth, request, planning, approval, payment, system)")
    action: str = Field(..., description="Specific event action verb")
    message: str = Field(..., description="Human-readable event summary")
    event_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Arbitrary context payload")


class TimelineEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: Optional[uuid.UUID] = None
    user_id: Optional[uuid.UUID] = None
    category: str
    action: str
    message: str
    event_metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
