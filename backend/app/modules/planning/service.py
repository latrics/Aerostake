import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.notifications.service import notification_service
from app.modules.planning.model import OperationalPlan, PlanStatusEnum, PlanningFormVersion, PlanningDraft
from app.modules.planning.repository import planning_repository
from app.modules.planning.schema import OperationalPlanCreate, PlanRevisionRequest, PlanningFormVersionCreate, PlanningDraftCreateOrUpdate
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
        project = await project_service.get_project_model(db, current_user, plan.project_id)

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
        project = await project_service.get_project_model(db, current_user, project_id)

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
        project = await project_service.get_project_model(db, current_user, project_id)

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

    async def create_planning_version(
        self,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
        version_in: PlanningFormVersionCreate,
    ) -> PlanningFormVersion:
        project = None
        try:
            project = await project_service.get_project_model(db, current_user, project_id)
        except Exception:
            project = None

        if not project:
            req_ver = await request_repository.get_by_id(db, project_id)
            if req_ver:
                project = await project_service.get_project_model(db, current_user, req_ver.project_id)
                project_id = req_ver.project_id

        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found",
            )

        # RBAC: Pilot is forbidden from modifying planning versions or remarks
        if current_user.role == RoleEnum.PILOT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Pilots do not have permission to modify planning versions or remarks",
            )

        # Stage Locking: If project has moved past planning, planning is permanently locked
        if project.status in [ProjectStatusEnum.APPROVED, ProjectStatusEnum.ACTIVE, ProjectStatusEnum.COMPLETED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Planning stage is completed and locked for this project. Historical records cannot be modified.",
            )

        # Determine sender role
        sender_role = (
            "ops"
            if current_user.role in [RoleEnum.ADMIN, RoleEnum.OPERATIONS]
            else "client"
        )
        sender_name = version_in.sender_name or current_user.full_name or ("LATRICS Ops" if sender_role == "ops" else "Client")

        # Determine version number: Versions count how many submissions are done by Ops
        latest_ops_ver = await planning_repository.get_latest_ops_version_number(db, project_id)
        if sender_role == "ops":
            next_ver_num = latest_ops_ver + 1
        else:
            # Client replies stay aligned with current Ops planning version
            next_ver_num = max(1, latest_ops_ver)

        # Format version code: ProjectName_V01, etc.
        clean_title = (project.title or "Project").strip()
        version_code = f"{clean_title}_V{str(next_ver_num).zfill(2)}"

        # Create version snapshot
        form_ver = await planning_repository.create_form_version(
            db=db,
            project_id=project_id,
            version_number=next_ver_num,
            version_code=version_code,
            sender=sender_role,
            sender_name=sender_name,
            form_data=version_in.form_data,
            stage_threads=version_in.stage_threads,
            clarification_threads=version_in.clarification_threads,
            attachments=version_in.attachments,
            status=version_in.status or "under_review",
            created_by=current_user.id,
        )

        # Update the background planning draft so DB draft and version snapshot stay completely aligned
        await planning_repository.save_or_update_draft(
            db=db,
            project_id=project.id,
            form_data=version_in.form_data,
            stage_threads=version_in.stage_threads,
            clarification_threads=version_in.clarification_threads,
            stage_draft_saved={},
            status=version_in.status or "under_review",
            updated_by=current_user.id,
        )

        # If Ops created the first planning form, move project to PLANNING status (Under Review)
        if project.status == ProjectStatusEnum.SUBMITTED and sender_role == "ops":
            await project_repository.update(db=db, project=project, status=ProjectStatusEnum.PLANNING)
            await timeline_service.log_event(
                db=db,
                category="planning",
                action="stage_advanced_to_planning",
                message=f"Survey request accepted by LATRICS Operations; flight planning & feasibility assessment initiated (Stage 2)",
                project_id=project.id,
                user_id=current_user.id,
                metadata={"stage": 2, "status": "PLANNING"},
            )

        # If project was previously cancelled/on-hold and Ops resumes planning (e.g. Need More Clarity)
        if project.status == ProjectStatusEnum.CANCELLED and sender_role == "ops" and version_in.status in ["awaiting_clarity", "under_review", "feasible_pending_client_confirmation", "feasible"]:
            await project_repository.update(db=db, project=project, status=ProjectStatusEnum.PLANNING)

        # If status indicates rejection, move to CANCELLED
        if version_in.status in ["cancelled", "not_feasible", "no"]:
            await project_repository.update(db=db, project=project, status=ProjectStatusEnum.CANCELLED)

        # If status indicates mobilization / acknowledgement, move to APPROVED
        if version_in.status in ["mobilising", "mobilizing", "approved"]:
            await project_repository.update(db=db, project=project, status=ProjectStatusEnum.APPROVED)
            await timeline_service.log_event(
                db=db,
                category="approval",
                action="request_converted_to_project",
                message=f"Survey Request converted to active Project '{project.title}' upon client feasibility sign-off; advanced to Stage 3 (Mobilising)",
                project_id=project.id,
                user_id=current_user.id,
                metadata={
                    "version_code": version_code,
                    "status": "APPROVED",
                    "stage": 3,
                },
            )
        elif version_in.status in ["clarification_submitted", "need_clarity", "awaiting_clarity"] and sender_role == "client":
            await timeline_service.log_event(
                db=db,
                category="planning",
                action="clarification_submitted",
                message=f"Client submitted operational clarification details and notes for {version_code}",
                project_id=project.id,
                user_id=current_user.id,
                metadata={
                    "version_code": version_code,
                    "status": form_ver.status,
                    "sender": "client",
                },
            )
        elif sender_role == "ops":
            is_rev = next_ver_num > 1
            act_name = "planning_revision_formulated" if is_rev else "operational_plan_formulated"
            act_msg = f"Operational plan revision {version_code} formulated by {sender_name}" if is_rev else f"Initial operational plan {version_code} formulated by {sender_name}"
            await timeline_service.log_event(
                db=db,
                category="planning",
                action=act_name,
                message=act_msg,
                project_id=project.id,
                user_id=current_user.id,
                metadata={
                    "version_number": next_ver_num,
                    "version_code": version_code,
                    "sender": "ops",
                    "status": form_ver.status,
                },
            )
        else:
            await timeline_service.log_event(
                db=db,
                category="planning",
                action="client_planning_feedback",
                message=f"Client submitted planning feedback for {version_code}",
                project_id=project.id,
                user_id=current_user.id,
                metadata={
                    "version_code": version_code,
                    "sender": sender_role,
                    "status": form_ver.status,
                },
            )

        return form_ver

    async def _resolve_project(
        self,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
    ) -> Project:
        project = None
        try:
            project = await project_service.get_project_model(db, current_user, project_id)
        except Exception:
            project = None

        if not project:
            req_ver = await request_repository.get_by_id(db, project_id)
            if req_ver:
                project = await project_service.get_project_model(db, current_user, req_ver.project_id)

        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found",
            )
        return project

    async def list_planning_versions(
        self,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
    ) -> List[PlanningFormVersion]:
        project = await self._resolve_project(db, current_user, project_id)
        return await planning_repository.list_form_versions_by_project(db, project.id)

    async def get_planning_draft(
        self,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
    ) -> Optional[PlanningDraft]:
        project = await self._resolve_project(db, current_user, project_id)
        return await planning_repository.get_draft_by_project(db, project.id)

    async def save_planning_draft(
        self,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
        draft_in: PlanningDraftCreateOrUpdate,
    ) -> PlanningDraft:
        project = await self._resolve_project(db, current_user, project_id)
        if current_user.role == RoleEnum.PILOT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Drone pilots have view-only access and cannot save planning drafts.",
            )
        return await planning_repository.save_or_update_draft(
            db=db,
            project_id=project.id,
            form_data=draft_in.form_data,
            stage_threads=draft_in.stage_threads,
            clarification_threads=draft_in.clarification_threads,
            stage_draft_saved=draft_in.stage_draft_saved,
            status=draft_in.status,
            updated_by=current_user.id,
        )


planning_service = PlanningService()

