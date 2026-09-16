import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.modules.invitations.model import InvitationStatusEnum
from app.modules.users.model import RoleEnum


class InvitationCreate(BaseModel):
    email: str = Field(..., description="Recipient email address to invite")
    role: RoleEnum = Field(..., description="Target role: operations, pilot, client_primary, or client_sub")
    company_name: Optional[str] = Field(default=None, max_length=255, description="Required when inviting a client_primary to establish organization")
    organization_id: Optional[uuid.UUID] = Field(default=None, description="Required when inviting client_sub to attach to existing organization")


class InvitationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    role: RoleEnum
    organization_id: Optional[uuid.UUID] = None
    token: str
    invited_by: uuid.UUID
    status: InvitationStatusEnum
    expires_at: datetime
    accepted_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class AcceptInvitationRequest(BaseModel):
    token: str = Field(..., description="Invitation token received via email")
    password: str = Field(..., min_length=6, description="Account password")
    full_name: Optional[str] = Field(default=None, max_length=255, description="User full name")
    phone_number: Optional[str] = Field(default=None, max_length=50, description="Contact phone number")
