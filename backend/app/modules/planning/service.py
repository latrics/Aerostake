import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.notifications.service import notification_service
from app.modules.planning.model import OperationalPlan, PlanStatusEnum
from app.modules.planning.repository import planning_repository
from app.modules.planning.schema import OperationalPlanCreate, PlanRevisionRequest
from app.modules.projects.model import Project, ProjectStatusEnum
from app.modules.projects.repository import project_repository
from app.modules.projects.service import project_service
from app.modules.requests.model import RequestVersion
from app.modules.requests.repository import request_repository
from app.modules.timeline.service import timeline_service
from app.modules.users.model import RoleEnum, User
from app.modules.users.repository import user_repository


class PlanningService:
    """Business logic for operational flight planning, quotation, and client approval."""

    async def publish_plan_for_request(
        self,
        db: AsyncSession,
        current_user: User,
        request_version_id: uuid.UUID,
        plan_in: OperationalPlanCreate,
    ) -> OperationalPlan:
        # 1. RBAC Guard: Only Admin or Operations can create/publish operational plans
        if current_user.role not in [RoleEnum.ADMIN, RoleEnum.OPERATIONS]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Admin or Operations personnel can formulate operational plans",
            )

        # 2. Fetch RequestVersion
        stmt = select_request = await db.get(RequestVersion, request_version_id)
        if not stmt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target request version not found",
            )
        request_ver: RequestVersion = stmt

        # 3. Fetch Parent Project
        project = await project_repository.get_by_id(db, request_ver.project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent project not found",
            )

        if project.status in [ProjectStatusEnum.COMPLETED, ProjectStatusEnum.CANCELLED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot publish plan for project in '{project.status.value}' state",
            )

        # 4. Supersede any existing published plans for this project
        existing_plans = await planning_repository.list_by_project(db, project.id)
        for p in existing_plans:
            if p.status == PlanStatusEnum.PUBLISHED:
                await planning_repository.update_status(db, p, PlanStatusEnum.SUPERSEDED)

        # 5. Create new plan and publish it
        plan = await planning_repository.create_plan(
            db=db,
            project_id=project.id,
            request_version_id=request_ver.id,
            estimated_flight_hours=plan_in.estimated_flight_hours,
            required_pilots_count=plan_in.required_pilots_count,
            required_drones_count=plan_in.required_drones_count,
            estimated_cost_usd=plan_in.estimated_cost_usd,
            flight_strategy_notes=plan_in.flight_strategy_notes,
        )

        published_plan = await planning_repository.publish_plan(
            db=db,
            plan=plan,
            published_by_user_id=current_user.id,
        )

        # 6. Update Project status to PLANNING
        await project_repository.update(db=db, project=project, status=ProjectStatusEnum.PLANNING)

        # 7. Log Timeline Event
        await timeline_service.log_event(
            db=db,
            category="planning",
            action="plan_published",
            message=f"Operational plan published for Request #{request_ver.version:03d} (${plan.estimated_cost_usd:,.2f})",
            project_id=project.id,
            user_id=current_user.id,
            metadata={
                "plan_id": str(published_plan.id),
                "request_version": request_ver.version,
                "flight_hours": plan.estimated_flight_hours,
                "pilots": plan.required_pilots_count,
                "drones": plan.required_drones_count,
                "cost_usd": plan.estimated_cost_usd,
            },
        )

        # 8. Notify Client
        client_user = await user_repository.get_by_id(db, project.client_id)
        if client_user:
            await notification_service.send_email(
                to_email=client_user.email,
                subject=f"Flight Plan Ready for Review: {project.title}",
                html_content=f"<p>An operational flight plan has been formulated for <b>{project.title}</b>. Cost estimate: ${plan.estimated_cost_usd:,.2f}. Please review and approve.</p>",
            )
            if client_user.device_token:
                await notification_service.send_push(
                    device_token=client_user.device_token,
                    title=f"Plan Ready: {project.title}",
                    body=f"Operational flight plan published (${plan.estimated_cost_usd:,.2f}). Awaiting your review.",
                    data={"project_id": str(project.id), "plan_id": str(published_plan.id), "action": "review_plan"},
                )

        return published_plan

    async def get_plan_by_id(
        self,
        db: AsyncSession,
        current_user: User,
        plan_id: uuid.UUID,
    ) -> OperationalPlan:
        plan = await planning_repository.get_by_id(db, plan_id)
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Operational plan not found",
            )

        # Verify access permission via project
        project = await project_service.get_project(db, current_user, plan.project_id)

        # Clients cannot see DRAFT plans
        if current_user.role == RoleEnum.CLIENT and plan.status == PlanStatusEnum.DRAFT:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Operational plan not available for review",
            )

        return plan

    async def get_active_plan(
        self,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
    ) -> OperationalPlan:
        await project_service.get_project(db, current_user, project_id)
        plan = await planning_repository.get_active_plan_for_project(db, project_id)
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No published operational plan found for this project",
            )
        return plan

    async def list_plans_for_project(
        self,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
    ) -> List[OperationalPlan]:
        await project_service.get_project(db, current_user, project_id)
        plans = await planning_repository.list_by_project(db, project_id)
        if current_user.role == RoleEnum.CLIENT:
            # Filter out internal Ops DRAFTs
            return [p for p in plans if p.status != PlanStatusEnum.DRAFT]
        return plans

    async def approve_plan(
        self,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
    ) -> Project:
        project = await project_service.get_project(db, current_user, project_id)

        # Only the client owner or Admin can approve
        if current_user.role == RoleEnum.CLIENT and project.client_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only approve plans for your own projects",
            )

        plan = await planning_repository.get_active_plan_for_project(db, project_id)
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No published operational plan available to approve",
            )

        # Transition Project status to APPROVED
        updated_project = await project_repository.update(
            db=db,
            project=project,
            status=ProjectStatusEnum.APPROVED,
        )

        # Log timeline event
        await timeline_service.log_event(
            db=db,
            category="approval",
            action="plan_approved",
            message=f"Client approved operational plan for '{project.title}' (${plan.estimated_cost_usd:,.2f})",
            project_id=project.id,
            user_id=current_user.id,
            metadata={
                "plan_id": str(plan.id),
                "approved_cost_usd": plan.estimated_cost_usd,
                "flight_hours": plan.estimated_flight_hours,
            },
        )

        # Send notification to Ops & Admin
        ops_users = await user_repository.get_users_by_roles(db, [RoleEnum.ADMIN, RoleEnum.OPERATIONS])
        for staff in ops_users:
            await notification_service.send_email(
                to_email=staff.email,
                subject=f"Plan Approved: {project.title}",
                html_content=f"<p>The operational plan for project <b>{project.title}</b> was approved by the client. Hardware and pilot allocation can now begin.</p>",
            )
            if staff.device_token:
                await notification_service.send_push(
                    device_token=staff.device_token,
                    title=f"Plan Approved: {project.title}",
                    body=f"Client approved plan (${plan.estimated_cost_usd:,.2f}). Ready for sector allocation.",
                    data={"project_id": str(project.id), "plan_id": str(plan.id), "action": "allocate"},
                )

        return updated_project

    async def request_plan_revision(
        self,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
        revision_in: PlanRevisionRequest,
    ) -> Project:
        project = await project_service.get_project(db, current_user, project_id)

        if current_user.role == RoleEnum.CLIENT and project.client_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only request revisions for your own projects",
            )

        plan = await planning_repository.get_active_plan_for_project(db, project_id)
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No published operational plan available to revise",
            )

        # Supersede current plan
        await planning_repository.update_status(db, plan, PlanStatusEnum.SUPERSEDED)

        # Return project to SUBMITTED state awaiting revised planning
        updated_project = await project_repository.update(
            db=db,
            project=project,
            status=ProjectStatusEnum.SUBMITTED,
        )

        # Log timeline event
        await timeline_service.log_event(
            db=db,
            category="approval",
            action="plan_revision_requested",
            message=f"Client requested revision on operational plan: '{revision_in.feedback_notes}'",
            project_id=project.id,
            user_id=current_user.id,
            metadata={
                "superseded_plan_id": str(plan.id),
                "feedback": revision_in.feedback_notes,
            },
        )

        # Send notification to Ops & Admin
        ops_users = await user_repository.get_users_by_roles(db, [RoleEnum.ADMIN, RoleEnum.OPERATIONS])
        for staff in ops_users:
            await notification_service.send_email(
                to_email=staff.email,
                subject=f"Revision Requested: {project.title}",
                html_content=f"<p>Client requested plan revisions for <b>{project.title}</b>.<br/>Feedback: {revision_in.feedback_notes}</p>",
            )
            if staff.device_token:
                await notification_service.send_push(
                    device_token=staff.device_token,
                    title=f"Revision Requested: {project.title}",
                    body=f"Client feedback: '{revision_in.feedback_notes[:80]}'",
                    data={"project_id": str(project.id), "plan_id": str(plan.id), "action": "revise_plan"},
                )

        return updated_project


planning_service = PlanningService()
