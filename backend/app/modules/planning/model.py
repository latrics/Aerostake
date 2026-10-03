import enum
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, Text, String, JSON, func
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
        Enum(PlanStatusEnum, name="plan_status_enum", create_type=False, values_callable=lambda obj: [e.value for e in obj]),
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


class PlanningFormVersion(Base):
    """Immutable snapshot of an 8-stage operational planning form response cycle."""
    __tablename__ = "planning_form_versions"

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
    version_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        index=True
    )
    version_code: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True
    )  # e.g. "PROJECT 2_V01"
    sender: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="ops"
    )  # "ops" or "client"
    sender_name: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    form_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        default=dict
    )
    stage_threads: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        default=dict
    )
    clarification_threads: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(
        JSON,
        nullable=True,
        default=list
    )
    attachments: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(
        JSON,
        nullable=True,
        default=list
    )
    status: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        default="under_review"
    )
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False
    )


class PlanningDraft(Base):
    """Background draft of planning form data per project (does not affect version history)."""
    __tablename__ = "planning_drafts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True
    )
    form_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        default=dict
    )
    stage_threads: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        default=dict
    )
    clarification_threads: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(
        JSON,
        nullable=True,
        default=list
    )
    stage_draft_saved: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        default=dict
    )
    status: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        default="under_review"
    )
    updated_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )


