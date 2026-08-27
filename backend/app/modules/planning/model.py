import enum
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PlanStatusEnum(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    SUPERSEDED = "superseded"


class OperationalPlan(Base):
    """Operational flight plan & resource estimation published by Latrics operations."""
    __tablename__ = "operational_plans"

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
    request_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("request_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    status: Mapped[PlanStatusEnum] = mapped_column(
        Enum(PlanStatusEnum, name="plan_status_enum", create_type=False),
        default=PlanStatusEnum.DRAFT,
        nullable=False,
        index=True
    )
    estimated_flight_hours: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )
    required_pilots_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )
    required_drones_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )
    estimated_cost_usd: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )
    flight_strategy_notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    published_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    published_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False
    )
