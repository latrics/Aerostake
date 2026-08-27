import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.projects.model import ProjectStatusEnum
from app.modules.projects.schema import ProjectCreate, ProjectOut, ProjectUpdate
from app.modules.projects.service import project_service
from app.modules.users.model import User
from app.security.auth import get_current_user

projects_router = APIRouter(prefix="/projects", tags=["Projects"])


@projects_router.post(
    "",
    response_model=ProjectOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new survey project",
)
async def create_project(
    project_in: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new project workspace container."""
    return await project_service.create_project(db, current_user, project_in)


@projects_router.get(
    "",
    response_model=List[ProjectOut],
    status_code=status.HTTP_200_OK,
    summary="List projects",
)
async def list_projects(
    status_filter: Optional[ProjectStatusEnum] = Query(default=None, alias="status"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List projects accessible to the authenticated user."""
    return await project_service.list_projects(
        db=db,
        current_user=current_user,
        status_filter=status_filter,
        skip=skip,
        limit=limit,
    )


@projects_router.get(
    "/{project_id}",
    response_model=ProjectOut,
    status_code=status.HTTP_200_OK,
    summary="Get project details by ID",
)
async def get_project(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve details of a specific project."""
    return await project_service.get_project(db, current_user, project_id)


@projects_router.patch(
    "/{project_id}",
    response_model=ProjectOut,
    status_code=status.HTTP_200_OK,
    summary="Update project details",
)
async def update_project(
    project_id: uuid.UUID,
    project_in: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update title, description, or status of a project."""
    return await project_service.update_project(db, current_user, project_id, project_in)
