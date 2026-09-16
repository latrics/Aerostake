import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class OrganizationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    subordinate_count: int = Field(default=0, description="Number of client_sub users currently active")
    max_subordinates: int = Field(default=4, description="Maximum subordinate quota")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
