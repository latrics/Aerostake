import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.modules.users.model import RoleEnum


class UserBase(BaseModel):
    email: str = Field(..., description="User email address")
    role: RoleEnum = Field(default=RoleEnum.CLIENT_PRIMARY, description="Role in portal")


class UserCreate(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="Raw password (minimum 6 characters)")
    role: Optional[RoleEnum] = Field(default=RoleEnum.CLIENT_PRIMARY, description="Role in portal")
    organization_id: Optional[uuid.UUID] = Field(default=None, description="Organization membership")


class UserLogin(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="User raw password")


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    role: RoleEnum
    is_active: bool
    organization_id: Optional[uuid.UUID] = None
    invited_by: Optional[uuid.UUID] = None
    device_token: Optional[str] = None
    full_name: Optional[str] = None
    company_name: Optional[str] = None
    phone_number: Optional[str] = None
    designation: Optional[str] = None
    company_profile: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, max_length=255, description="Client or Staff Full Name")
    email: Optional[str] = Field(default=None, description="Personal Email Address")
    company_name: Optional[str] = Field(default=None, max_length=255, description="Organization or Enterprise Name")
    phone_number: Optional[str] = Field(default=None, max_length=50, description="Contact Phone Number")
    designation: Optional[str] = Field(default=None, max_length=150, description="Personal Job Designation / Department")
    company_profile: Optional[dict] = Field(default=None, description="Detailed company and team profile")


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., description="Current raw password")
    new_password: str = Field(..., min_length=6, description="New raw password (minimum 6 characters)")


class DeviceTokenRegisterRequest(BaseModel):
    device_token: str = Field(..., min_length=10, max_length=512, description="Firebase/WebPush Device Registration Token")


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class TokenPayload(BaseModel):
    sub: str
    role: str
    exp: int
    type: str


class UserStatusUpdate(BaseModel):
    is_active: bool = Field(..., description="Active status flag")

