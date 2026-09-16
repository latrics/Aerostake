import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.modules.allocations.model import AllocationStatusEnum


class AllocationCreate(BaseModel):
    pilot_id: uuid.UUID = Field(..., description="UUID of the licensed pilot assigned to this sector")
    drone_model: str = Field(..., min_length=2, max_length=100, description="Drone model (e.g. DJI Matrice 300 RTK)")
    drone_serial_number: str = Field(..., min_length=2, max_length=100, description="Hardware registration serial number")


class AllocationStatusUpdate(BaseModel):
    status: AllocationStatusEnum = Field(..., description="Updated pilot allocation status")


class AllocationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sector_id: uuid.UUID
    project_id: uuid.UUID
    pilot_id: uuid.UUID
    drone_model: str
    drone_serial_number: str
    status: AllocationStatusEnum
    assigned_by: Optional[uuid.UUID] = None
    allocated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    pilot_name: Optional[str] = None
    pilot_email: Optional[str] = None
    sector_code: Optional[str] = None
