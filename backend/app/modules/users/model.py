import enum
from typing import Optional
import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, JSON, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class RoleEnum(str, enum.Enum):
    ADMIN = "admin"
    OPERATIONS = "operations"
    PILOT = "pilot"
    CLIENT_PRIMARY = "client_primary"
    CLIENT_SUB = "client_sub"
    CLIENT = "client"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    role: Mapped[RoleEnum] = mapped_column(
        Enum(RoleEnum, name="role_enum", create_type=False, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=RoleEnum.CLIENT_PRIMARY
    )
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    invited_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    device_token: Mapped[Optional[str]] = mapped_column(
        String(512),
        nullable=True,
        default=None
    )
    full_name: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        default=None
    )
    company_name: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        default=None
    )
    phone_number: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        default=None
    )
    company_profile: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
        default=None
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    @property
    def designation(self) -> Optional[str]:
        if self.company_profile and isinstance(self.company_profile, dict):
            if self.company_profile.get("designation"):
                return str(self.company_profile["designation"])
            primary_contact = self.company_profile.get("primary_contact")
            if isinstance(primary_contact, dict):
                return primary_contact.get("department") or primary_contact.get("designation")
        return None
