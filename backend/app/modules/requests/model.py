import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class RequestVersion(Base):
    """Immutable client survey requirement submission version (#001, #002, etc.)."""
    __tablename__ = "request_versions"

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
    version: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        index=True
    )
    survey_location: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    survey_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    target_area_sqkm: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True
    )
    requirements_payload: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        default=dict
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
