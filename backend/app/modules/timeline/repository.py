import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.timeline.model import TimelineEvent


class TimelineRepository:
    """Raw database operations for immutable timeline events."""

    async def create_event(
        self,
        db: AsyncSession,
        category: str,
        action: str,
        message: str,
        project_id: Optional[uuid.UUID] = None,
        user_id: Optional[uuid.UUID] = None,
        event_metadata: Optional[Dict[str, Any]] = None,
    ) -> TimelineEvent:
        event = TimelineEvent(
            project_id=project_id,
            user_id=user_id,
            category=category,
            action=action,
            message=message,
            event_metadata=event_metadata or {},
        )
        db.add(event)
        await db.flush()
        await db.refresh(event)
        return event

    async def list_by_project(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
        limit: int = 100,
    ) -> List[TimelineEvent]:
        stmt = (
            select(TimelineEvent)
            .where(TimelineEvent.project_id == project_id)
            .order_by(TimelineEvent.created_at.desc())
            .limit(limit)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def list_by_category(
        self,
        db: AsyncSession,
        category: str,
        limit: int = 100,
    ) -> List[TimelineEvent]:
        stmt = (
            select(TimelineEvent)
            .where(TimelineEvent.category == category)
            .order_by(TimelineEvent.created_at.desc())
            .limit(limit)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())


timeline_repository = TimelineRepository()
