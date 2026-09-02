import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.modules.users.model import RoleEnum


class UserBase(BaseModel):
    email: str = Field(..., description="User email address")
    role: RoleEnum = Field(default=RoleEnum.CLIENT, description="Role in portal")


class UserCreate(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="Raw password (minimum 6 characters)")
    role: Optional[RoleEnum] = Field(default=RoleEnum.CLIENT, description="Role in portal")


class UserLogin(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="User raw password")


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    role: RoleEnum
    is_active: bool
    device_token: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


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
