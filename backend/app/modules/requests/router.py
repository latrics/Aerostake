import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.requests.schema import RequestVersionCreate, RequestVersionOut
from app.modules.requests.service import request_service
from app.modules.users.model import User
from app.security.auth import get_current_user

requests_router = APIRouter(prefix="/projects/{project_id}/requests", tags=["Requests"])


@requests_router.post(
    "",
    response_model=RequestVersionOut,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a new version of survey requirements (#001, #002, etc.)",
)
async def submit_request(
    project_id: uuid.UUID,
    request_in: RequestVersionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit an immutable versioned survey request for a project."""
    return await request_service.submit_request(
        db=db,
        current_user=current_user,
        project_id=project_id,
        request_in=request_in,
    )


@requests_router.get(
    "",
    response_model=List[RequestVersionOut],
    status_code=status.HTTP_200_OK,
    summary="List all request submission versions for a project",
)
async def list_project_requests(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all chronological request versions submitted for a project."""
    return await request_service.list_project_requests(
        db=db,
        current_user=current_user,
        project_id=project_id,
    )


@requests_router.get(
    "/{version}",
    response_model=RequestVersionOut,
    status_code=status.HTTP_200_OK,
    summary="Get a specific request version by version number",
)
async def get_project_request_by_version(
    project_id: uuid.UUID,
    version: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve a specific immutable request version."""
    return await request_service.get_project_request_by_version(
        db=db,
        current_user=current_user,
        project_id=project_id,
        version=version,
    )
