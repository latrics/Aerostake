import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.planning.schema import (
    OperationalPlanCreate,
    OperationalPlanOut,
    PlanRevisionRequest,
)
from app.modules.planning.service import planning_service
from app.modules.projects.schema import ProjectOut
from app.modules.users.model import RoleEnum, User
from app.security.auth import get_current_user
from app.security.permissions import require_role

planning_router = APIRouter(tags=["Planning & Approval"])


@planning_router.post(
    "/planning/requests/{request_version_id}",
    response_model=OperationalPlanOut,
    status_code=status.HTTP_201_CREATED,
    summary="Publish operational plan for a specific request version (Ops/Admin only)",
)
async def publish_plan_for_request(
    request_version_id: uuid.UUID,
    plan_in: OperationalPlanCreate,
    current_user: User = Depends(require_role(RoleEnum.ADMIN, RoleEnum.OPERATIONS)),
    db: AsyncSession = Depends(get_db),
):
    """Publish a resource estimation, flight strategy, and cost quotation for a survey request."""
    return await planning_service.publish_plan_for_request(
        db=db,
        current_user=current_user,
        request_version_id=request_version_id,
        plan_in=plan_in,
    )


@planning_router.get(
    "/planning/plans/{plan_id}",
    response_model=OperationalPlanOut,
    status_code=status.HTTP_200_OK,
    summary="Get operational plan by ID",
)
async def get_plan_by_id(
    plan_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve details of a specific operational plan."""
    return await planning_service.get_plan_by_id(
        db=db,
        current_user=current_user,
        plan_id=plan_id,
    )


@planning_router.get(
    "/projects/{project_id}/plan",
    response_model=OperationalPlanOut,
    status_code=status.HTTP_200_OK,
    summary="Get active published operational plan for a project",
)
async def get_active_plan(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve the currently active published operational plan awaiting client review/approval."""
    return await planning_service.get_active_plan(
        db=db,
        current_user=current_user,
        project_id=project_id,
    )


@planning_router.get(
    "/projects/{project_id}/plans",
    response_model=List[OperationalPlanOut],
    status_code=status.HTTP_200_OK,
    summary="List all historical plans for a project",
)
async def list_project_plans(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all operational plans (historical and active) associated with a project."""
    return await planning_service.list_plans_for_project(
        db=db,
        current_user=current_user,
        project_id=project_id,
    )


@planning_router.post(
    "/projects/{project_id}/approve",
    response_model=ProjectOut,
    status_code=status.HTTP_200_OK,
    summary="Client approves active operational flight plan",
)
async def approve_plan(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Client approves the published operational flight plan and quotation, transitioning project to APPROVED."""
    return await planning_service.approve_plan(
        db=db,
        current_user=current_user,
        project_id=project_id,
    )


@planning_router.post(
    "/projects/{project_id}/revise",
    response_model=ProjectOut,
    status_code=status.HTTP_200_OK,
    summary="Client requests revision on operational plan",
)
async def request_plan_revision(
    project_id: uuid.UUID,
    revision_in: PlanRevisionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Client requests operational changes, marking the current plan as SUPERSEDED and returning project to SUBMITTED."""
    return await planning_service.request_plan_revision(
        db=db,
        current_user=current_user,
        project_id=project_id,
        revision_in=revision_in,
    )
