import enum
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, JSON, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SectorStatusEnum(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    SURVEYED = "surveyed"
    FLAGGED = "flagged"
    VERIFIED = "verified"


class Sector(Base):
    """Discrete flight polygon subdivision of an approved operational plan."""
    __tablename__ = "sectors"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("operational_plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    sector_code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True
    )
    status: Mapped[SectorStatusEnum] = mapped_column(
        Enum(SectorStatusEnum, name="sector_status_enum", create_type=False),
        default=SectorStatusEnum.PENDING,
        nullable=False,
        index=True
    )
    polygon_coordinates: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        default=dict
    )
    target_area_sqkm: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True
    )
    estimated_flight_minutes: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True
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
