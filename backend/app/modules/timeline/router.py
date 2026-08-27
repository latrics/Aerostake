import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.projects.service import project_service
from app.modules.timeline.schema import TimelineEventOut
from app.modules.timeline.service import timeline_service
from app.modules.users.model import User
from app.security.auth import get_current_user

timeline_router = APIRouter(tags=["Timeline"])


@timeline_router.get(
    "/timeline/{project_id}",
    response_model=List[TimelineEventOut],
    status_code=status.HTTP_200_OK,
    summary="Get project lifecycle audit timeline events",
)
async def get_project_timeline(
    project_id: uuid.UUID,
    category: Optional[str] = Query(default=None, description="Filter timeline events by category (e.g. auth, request, planning, approval, allocation, execution, payment)"),
    limit: int = Query(default=100, ge=1, le=500, description="Max event entries to return"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve the chronological, immutable event timeline feed for a survey project."""
    # Verify user has access to this project
    await project_service.get_project(db, current_user, project_id)
    return await timeline_service.get_project_timeline(
        db=db,
        project_id=project_id,
        category=category,
        limit=limit,
    )
