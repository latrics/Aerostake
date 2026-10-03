import uuid
import logging
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.timeline.model import TimelineEvent
from app.modules.timeline.repository import timeline_repository
from app.modules.timeline.schema import TimelineEventOut
from app.modules.users.model import RoleEnum, User
from app.modules.users.repository import user_repository

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
        # Normalize category 'project' to 'request' for survey requests
        norm_cat = category.strip().lower()
        if norm_cat == "project":
            norm_cat = "request"

        event = await timeline_repository.create_event(
            db=db,
            category=norm_cat,
            action=action,
            message=message,
            project_id=project_id,
            user_id=user_id,
            event_metadata=metadata,
        )
        logger.info(
            f"[TIMELINE] [{norm_cat.upper()}] {action}: '{message}' (project={project_id}, user={user_id})"
        )
        return event

    async def get_project_timeline(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
        category: Optional[str] = None,
        limit: int = 100,
    ) -> List[dict]:
        """Fetch chronological timeline events for a given project, optionally filtered by category,
        enriched with actual actor identity, role, and normalized categories."""
        raw_events = await timeline_repository.list_by_project(db, project_id, category=category, limit=limit)

        # Collect distinct user_ids
        user_ids = {e.user_id for e in raw_events if e.user_id}
        user_map: Dict[uuid.UUID, User] = {}
        for uid in user_ids:
            try:
                u = await user_repository.get_by_id(db, uid)
                if u and hasattr(u, "full_name") and not callable(u.full_name) and not hasattr(u.full_name, "__await__"):
                    user_map[uid] = u
            except Exception:
                pass

        enriched_events = []
        for e in raw_events:
            u = user_map.get(e.user_id) if e.user_id else None
            meta = e.event_metadata or {}

            # Determine Actor Name, Role, Email
            actor_name = None
            actor_role = None
            actor_email = None

            if u:
                actor_name = u.full_name or u.email
                actor_email = u.email
                role_val = u.role.value if hasattr(u.role, 'value') else str(u.role).lower()
                if role_val in ['client_primary', 'client_sub', 'client']:
                    actor_role = 'Client'
                elif role_val in ['operations', 'admin']:
                    actor_role = 'LATRICS Ops'
                elif role_val == 'pilot':
                    actor_role = 'Flight Crew'
                else:
                    actor_role = role_val.capitalize()
            elif meta.get("sender_name"):
                actor_name = meta.get("sender_name")
                sender_r = str(meta.get("sender") or meta.get("sender_role") or "").lower()
                if "client" in sender_r:
                    actor_role = "Client"
                elif "ops" in sender_r:
                    actor_role = "LATRICS Ops"
                elif "pilot" in sender_r:
                    actor_role = "Flight Crew"
                else:
                    actor_role = "User"
            else:
                # Infer from message content if author is mentioned
                msg = e.message or ""
                if "(OPS)" in msg:
                    parts = msg.split("created by ")
                    if len(parts) > 1:
                        actor_name = parts[1].replace("(OPS)", "").strip()
                    actor_role = "LATRICS Ops"
                elif "(CLIENT)" in msg:
                    parts = msg.split("created by ")
                    if len(parts) > 1:
                        actor_name = parts[1].replace("(CLIENT)", "").strip()
                    actor_role = "Client"
                elif "initialized by " in msg:
                    parts = msg.split("initialized by ")
                    if len(parts) > 1:
                        actor_name = parts[1].strip()
                        actor_email = actor_name
                    actor_role = "Client"
                elif "Initial Survey Request" in msg or "request_submitted" in e.action:
                    actor_role = "Client"
                else:
                    actor_role = "System"

            # Normalize Category (User requirement: category 'project' is wrong, must be 'request')
            cat = (e.category or "operation").lower()
            if cat == "project":
                cat = "request"

            enriched_events.append(TimelineEventOut(
                id=e.id,
                project_id=e.project_id,
                user_id=e.user_id,
                category=cat,
                action=e.action,
                message=e.message,
                event_metadata=e.event_metadata,
                created_at=e.created_at,
                actor_name=actor_name or "System",
                actor_role=actor_role or "System",
                actor_email=actor_email,
            ))

        return enriched_events


timeline_service = TimelineService()
