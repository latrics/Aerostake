import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.modules.planning.model import PlanStatusEnum


class OperationalPlanCreate(BaseModel):
    estimated_flight_hours: float = Field(..., gt=0.0, description="Estimated total flight hours required")
    required_pilots_count: int = Field(..., ge=1, description="Number of licensed pilots needed")
    required_drones_count: int = Field(..., ge=1, description="Number of drone units required")
    estimated_cost_usd: float = Field(..., ge=0.0, description="Estimated total survey quotation in USD")
    flight_strategy_notes: Optional[str] = Field(default=None, description="Operational notes and survey flight strategy")


class OperationalPlanUpdate(BaseModel):
    estimated_flight_hours: Optional[float] = Field(default=None, gt=0.0)
    required_pilots_count: Optional[int] = Field(default=None, ge=1)
    required_drones_count: Optional[int] = Field(default=None, ge=1)
    estimated_cost_usd: Optional[float] = Field(default=None, ge=0.0)
    flight_strategy_notes: Optional[str] = None


class OperationalPlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    request_version_id: uuid.UUID
    status: PlanStatusEnum
    estimated_flight_hours: float
    required_pilots_count: int
    required_drones_count: int
    estimated_cost_usd: float
    flight_strategy_notes: Optional[str] = None
    published_by: Optional[uuid.UUID] = None
    published_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class PlanRevisionRequest(BaseModel):
    feedback_notes: str = Field(..., min_length=5, description="Client feedback explaining requested plan revisions")
