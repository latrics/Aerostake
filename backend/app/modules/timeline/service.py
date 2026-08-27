import uuid
import logging
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.timeline.model import TimelineEvent
from app.modules.timeline.repository import timeline_repository

logger = logging.getLogger("aerostake.timeline")


class TimelineService:
    """Core domain service for appending and retrieving immutable audit timeline events."""

    async def log_event(
        self,
        db: AsyncSession,
        category: str,
        action: str,
        message: str,
        project_id: Optional[uuid.UUID] = None,
        user_id: Optional[uuid.UUID] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> TimelineEvent:
        """Record an immutable lifecycle event to the timeline."""
        event = await timeline_repository.create_event(
            db=db,
            category=category,
            action=action,
            message=message,
            project_id=project_id,
            user_id=user_id,
            event_metadata=metadata,
        )
        logger.info(
            f"[TIMELINE] [{category.upper()}] {action}: '{message}' (project={project_id}, user={user_id})"
        )
        return event

    async def get_project_timeline(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
        category: Optional[str] = None,
        limit: int = 100,
    ) -> List[TimelineEvent]:
        """Fetch chronological timeline events for a given project, optionally filtered by category."""
        return await timeline_repository.list_by_project(db, project_id, category=category, limit=limit)


timeline_service = TimelineService()
