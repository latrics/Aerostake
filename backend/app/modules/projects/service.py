import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.invitations.repository import invitation_repository
from app.modules.notifications.service import notification_service
from app.modules.projects.model import Project, ProjectStatusEnum
from app.modules.projects.repository import project_repository
from app.modules.projects.schema import ProjectCreate, ProjectUpdate
from app.modules.requests.repository import request_repository
from app.modules.timeline.service import timeline_service
from app.modules.users.model import RoleEnum, User
from app.modules.users.repository import user_repository


class ProjectService:
    """Business logic, organization workspace scoping, and audit lifecycle for Projects."""

    async def create_project(
        self,
        db: AsyncSession,
        current_user: User,
        project_in: ProjectCreate,
    ) -> Project:
        # Determine organization_id
        org_id = current_user.organization_id
        if not org_id:
            # If user does not have an org yet, auto-provision one from company_name or user email
            org_name = current_user.company_name or f"{current_user.email.split('@')[0]} Org"
            org = await invitation_repository.get_or_create_organization(db, org_name)
            org_id = org.id
            current_user.organization_id = org.id
            await db.flush()

        project = await project_repository.create(
            db=db,
            title=project_in.title,
            description=project_in.description,
            organization_id=org_id,
            created_by=current_user.id,
            client_id=current_user.id,
        )

        # 1. Log ProjectStatusHistory on creation
        await project_repository.log_status_history(
            db=db,
            project_id=project.id,
            from_status=None,
            to_status=ProjectStatusEnum.DRAFT,
            changed_by=current_user.id,
            notes=f"Project initialized by {current_user.email}",
        )

        # 2. Log timeline event
        await timeline_service.log_event(
            db=db,
            category="request",
            action="request_created",
            message=f"Survey Request #001 initialized for project '{project.title}' by {current_user.email}",
            project_id=project.id,
            user_id=current_user.id,
            metadata={"status": project.status.value, "organization_id": str(org_id)},
        )

        # 3. Check if an initial survey request was bundled with project creation
        is_draft = getattr(project_in, "is_draft", False) or (project_in.status == ProjectStatusEnum.DRAFT if getattr(project_in, "status", None) else False)

        if project_in.survey_location or (project_in.requirements_payload and len(project_in.requirements_payload) > 0) or is_draft:
            req_ver = await request_repository.create_version(
                db=db,
                project_id=project.id,
                version=1,
                survey_location=project_in.survey_location or "Specified in Survey Scope",
                survey_type=project_in.survey_type or "topography",
                target_area_sqkm=project_in.target_area_sqkm,
                requirements_payload=project_in.requirements_payload or {},
                created_by=current_user.id,
            )

            if not is_draft:
                # Update project status to SUBMITTED
                project = await project_repository.update(
                    db=db,
                    project=project,
                    status=ProjectStatusEnum.SUBMITTED,
                )

                # Log status history for transition to SUBMITTED
                await project_repository.log_status_history(
                    db=db,
                    project_id=project.id,
                    from_status=ProjectStatusEnum.DRAFT,
                    to_status=ProjectStatusEnum.SUBMITTED,
                    changed_by=current_user.id,
                    notes="Initial survey request #001 submitted",
                )

            # Log request submission timeline event
            await timeline_service.log_event(
                db=db,
                category="request",
                action="request_submitted",
                message=f"Initial Survey Request #001 submitted for project '{project.title}'",
                project_id=project.id,
                user_id=current_user.id,
                metadata={
                    "version": 1,
                    "survey_location": req_ver.survey_location,
                    "survey_type": req_ver.survey_type,
                    "target_area_sqkm": req_ver.target_area_sqkm,
                },
            )

            # Notifications to client
            await notification_service.send_email(
                to_email=current_user.email,
                subject=f"Survey Request Received: {project.title} (#001)",
                html_content=f"<p>Thank you. Your survey request for <b>{project.title}</b> has been received and queued for operational flight planning and quotation.</p>",
            )
            if current_user.device_token:
                await notification_service.send_push(
                    device_token=current_user.device_token,
                    title="Survey Request Confirmed",
                    body=f"Survey request for '{project.title}' queued for operational planning.",
                    data={"project_id": str(project.id), "version": "1"},
                )

            # Notifications to Ops and Admin staff
            ops_users = await user_repository.get_users_by_roles(db, [RoleEnum.ADMIN, RoleEnum.OPERATIONS])
            for staff in ops_users:
                await notification_service.send_email(
                    to_email=staff.email,
                    subject=f"New Survey Request: {project.title} (#001)",
                    html_content=f"<p>A new survey project & request was submitted for <b>{project.title}</b> at location <i>{req_ver.survey_location}</i> by {current_user.email}.</p>",
                )
                if staff.device_token:
                    await notification_service.send_push(
                        device_token=staff.device_token,
                        title=f"New Survey Request: {project.title}",
                        body=f"Request #001 at {req_ver.survey_location} ({req_ver.target_area_sqkm or 'N/A'} sq km).",
                        data={"project_id": str(project.id), "request_id": str(req_ver.id), "action": "draft_plan"},
                    )

        return project

    async def _enrich_project(self, db: AsyncSession, project: Project) -> dict:
        client_user = None
        try:
            client_user = await user_repository.get_by_id(db, project.client_id) if project.client_id else None
        except Exception:
            client_user = None

        creator_user = client_user
        if getattr(project, 'created_by', None) and project.created_by != project.client_id:
            try:
                creator_user = await user_repository.get_by_id(db, project.created_by)
            except Exception:
                creator_user = client_user

        org_name = getattr(client_user, 'company_name', None) if client_user else None

        reqs = []
        try:
            reqs = await request_repository.list_by_project(db, project.id)
        except Exception:
            reqs = []
        latest_req = reqs[-1] if reqs else None

        sectors = []
        try:
            from app.modules.sectors.repository import sector_repository
            sectors = await sector_repository.list_by_project(db, project.id)
        except Exception:
            sectors = []

        total_sectors = len(sectors)
        completed_sectors = sum(1 for s in sectors if getattr(s.status, 'value', str(s.status)) in ['verified', 'surveyed'])
        progress_pct = round((completed_sectors / total_sectors) * 100) if total_sectors > 0 else (100 if project.status == ProjectStatusEnum.COMPLETED else 0)

        return {
            "id": project.id,
            "title": project.title,
            "description": project.description,
            "client_id": project.client_id,
            "organization_id": getattr(project, 'organization_id', None),
            "created_by": getattr(project, 'created_by', None),
            "status": project.status,
            "latest_request": latest_req,
            "client_email": client_user.email if client_user else None,
            "client_name": client_user.full_name if client_user and getattr(client_user, 'full_name', None) else (client_user.email.split('@')[0] if client_user else None),
            "client_company": org_name,
            "creator_name": creator_user.full_name if creator_user and getattr(creator_user, 'full_name', None) else (creator_user.email.split('@')[0] if creator_user else None),
            "creator_role": creator_user.role.value if creator_user and hasattr(creator_user.role, "value") else (str(creator_user.role) if creator_user else None),
            "creator_email": creator_user.email if creator_user else None,
            "survey_location": getattr(latest_req, 'survey_location', None) if latest_req else None,
            "survey_type": getattr(latest_req, 'survey_type', None) if latest_req else None,
            "target_area_sqkm": getattr(latest_req, 'target_area_sqkm', None) if latest_req else None,
            "requirements_payload": getattr(latest_req, 'requirements_payload', None) if latest_req else None,
            "sectors_count": total_sectors,
            "completed_sectors_count": completed_sectors,
            "progress_pct": progress_pct,
            "created_at": getattr(project, 'created_at', None),
            "updated_at": getattr(project, 'updated_at', None),
        }


    async def get_project_model(
        self,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
    ) -> Project:
        project = await project_repository.get_by_id(db, project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found",
            )

        # Ownership check: Clients can only access projects of their organization or created by them
        if current_user.role in [RoleEnum.CLIENT_PRIMARY, RoleEnum.CLIENT_SUB, RoleEnum.CLIENT]:
            has_org_access = (
                current_user.organization_id is not None
                and project.organization_id is not None
                and current_user.organization_id == project.organization_id
            )
            has_user_access = (
                project.client_id == current_user.id
                or project.created_by == current_user.id
            )
            is_subordinate_access = False
            if current_user.role == RoleEnum.CLIENT_SUB:
                if current_user.invited_by and (current_user.invited_by == project.client_id or current_user.invited_by == project.created_by):
                    is_subordinate_access = True
                elif project.requirements_payload and isinstance(project.requirements_payload, dict):
                    sub_info = project.requirements_payload.get('appointed_subordinate') or {}
                    if sub_info.get('id') == str(current_user.id) or (sub_info.get('email') and current_user.email and sub_info.get('email').lower() == current_user.email.lower()):
                        is_subordinate_access = True

            if not has_org_access and not has_user_access and not is_subordinate_access:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to access this project",
                )

        return project

    async def get_project(
        self,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
    ) -> dict:
        project = await self.get_project_model(db, current_user, project_id)
        return await self._enrich_project(db, project)


    async def list_projects(
        self,
        db: AsyncSession,
        current_user: User,
        status_filter: Optional[ProjectStatusEnum] = None,
        include_unconverted: bool = False,
        skip: int = 0,
        limit: int = 100,
    ) -> List[dict]:
        if current_user.role in [RoleEnum.CLIENT_PRIMARY, RoleEnum.CLIENT_SUB, RoleEnum.CLIENT]:
            if current_user.organization_id:
                raw_projects = await project_repository.list_by_organization(
                    db=db,
                    organization_id=current_user.organization_id,
                    skip=skip,
                    limit=limit,
                )
            elif current_user.role == RoleEnum.CLIENT_SUB and current_user.invited_by:
                raw_projects = await project_repository.list_by_client(
                    db=db,
                    client_id=current_user.invited_by,
                    skip=skip,
                    limit=limit,
                )
            else:
                raw_projects = await project_repository.list_by_client(
                    db=db,
                    client_id=current_user.id,
                    skip=skip,
                    limit=limit,
                )
        else:
            raw_projects = await project_repository.list_all(
                db=db,
                skip=skip,
                limit=limit,
                status=status_filter,
            )

        # Domain lifecycle rule: Requests in planning phase (DRAFT, SUBMITTED, PLANNING)
        # remain strictly in the Requests section until Planning is approved by Ops and
        # Acknowledged by Client. Only converted projects appear in the Projects section.
        if status_filter is not None:
            raw_projects = [p for p in raw_projects if p.status == status_filter]
        elif not include_unconverted:
            unconverted_statuses = [
                ProjectStatusEnum.DRAFT,
                ProjectStatusEnum.SUBMITTED,
                ProjectStatusEnum.PLANNING,
            ]
            raw_projects = [p for p in raw_projects if p.status not in unconverted_statuses]

        results = []
        for p in raw_projects:
            results.append(await self._enrich_project(db, p))
        return results


    async def update_project(
        self,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
        project_in: ProjectUpdate,
    ) -> dict:
        project = await self.get_project_model(db, current_user, project_id)
        old_status = project.status
        new_status = project_in.status

        # 1. Permanent Stage Locking: Completed projects cannot be modified by anyone
        if old_status == ProjectStatusEnum.COMPLETED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Completed projects are permanently sealed and read-only.",
            )

        # 2. Pilot access restrictions: Pilot can ONLY post to Stage 4 chat during active capturing
        if current_user.role == RoleEnum.PILOT:
            if project_in.title is not None or project_in.description is not None or project_in.status is not None:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Pilots do not have permission to modify project specifications.",
                )
            if project_in.requirements_payload is not None:
                req_payload = project_in.requirements_payload
                if not isinstance(req_payload, dict) or "stage_chats" not in req_payload:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Pilots can only append messages to Stage 4 (Capturing) discussion.",
                    )

        # 3. Stage 3 Mobilisation Locking: Once project moves to ACTIVE or COMPLETED, mobilisation data cannot be changed
        if old_status in [ProjectStatusEnum.ACTIVE, ProjectStatusEnum.COMPLETED] and project_in.requirements_payload:
            current_mob = (getattr(project, 'requirements_payload', None) or {}).get("mobilisation")
            if not current_mob:
                reqs_for_mob = await request_repository.list_by_project(db, project.id)
                current_mob = (reqs_for_mob[-1].requirements_payload or {}).get("mobilisation") if reqs_for_mob else None
            new_mob = project_in.requirements_payload.get("mobilisation")
            if current_mob and new_mob and current_mob != new_mob:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Mobilisation phase is completed and sealed for this project.",
                )

        # 4. Mobilisation Next-Stage Gating (Stage 3 -> Stage 4 Capturing):
        # Moving to ACTIVE requires Ops ticket/bill validation (if Client) or Ops transaction verification (if Latrics)
        if new_status == ProjectStatusEnum.ACTIVE and old_status in [ProjectStatusEnum.APPROVED, ProjectStatusEnum.PLANNING]:
            reqs = await request_repository.list_by_project(db, project.id)
            latest_payload = (project_in.requirements_payload if project_in.requirements_payload is not None else (getattr(project, 'requirements_payload', None) or (reqs[-1].requirements_payload if reqs else {}))) or {}
            mob = latest_payload.get("mobilisation") or {}
            if mob:
                resp = mob.get("responsibility")
                if resp == "CLIENT":
                    ticket_approval = mob.get("clientTicketApprovalStatus") or mob.get("client_ticket_approval_status")
                    if ticket_approval != "APPROVED":
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Cannot advance to Capturing stage: Client mobilization tickets and bills have not been approved and validated by Operations as genuine.",
                        )
                elif resp == "LATRICS":
                    advance_verification = mob.get("latricsAdvancePaymentStatus") or mob.get("latrics_advance_payment_status")
                    if advance_verification != "VERIFIED":
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Cannot advance to Capturing stage: Client's ₹5,000 mobilization advance deposit transaction slip has not been verified by Operations.",
                        )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Cannot advance to Capturing stage: Mobilization responsibility (Client or Latrics) has not been assigned.",
                    )

        # 5. Processing Next-Stage Gating (Stage 5 Processing -> Stage 6 Delivered):
        # Moving to COMPLETED requires Client to acknowledge receipt of processing deliverables
        if new_status == ProjectStatusEnum.COMPLETED and old_status in [ProjectStatusEnum.ACTIVE, ProjectStatusEnum.APPROVED]:
            reqs = await request_repository.list_by_project(db, project.id)
            latest_payload = (project_in.requirements_payload if project_in.requirements_payload is not None else (getattr(project, 'requirements_payload', None) or (reqs[-1].requirements_payload if reqs else {}))) or {}
            proc_deliv = latest_payload.get("processing_deliverables") or {}
            client_ack = (proc_deliv.get("client_signoff") or {}).get("acknowledged") or proc_deliv.get("client_acknowledged")
            if not client_ack:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot advance to Delivered stage: Client has not yet acknowledged receipt of the survey deliverables.",
                )

        # Allow client to submit their own draft project
        is_client_submitting_draft = (
            old_status == ProjectStatusEnum.DRAFT
            and new_status == ProjectStatusEnum.SUBMITTED
            and (project.client_id == current_user.id or getattr(project, 'created_by', None) == current_user.id or current_user.role in [RoleEnum.CLIENT_PRIMARY, RoleEnum.CLIENT_SUB, RoleEnum.CLIENT])
        )

        if new_status is not None and new_status != old_status:
            if not is_client_submitting_draft and current_user.role not in [RoleEnum.ADMIN, RoleEnum.OPERATIONS]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only Admin or Operations staff can manually update project status",
                )

        # Capture previous request state for delta detection
        existing_reqs = await request_repository.list_by_project(db, project.id)
        old_req_payload: Dict[str, Any] = (existing_reqs[-1].requirements_payload if existing_reqs else {}) or {}

        # Synchronize requirements_payload, survey_location, survey_type onto latest request version
        if project_in.requirements_payload is not None or project_in.survey_location is not None or project_in.survey_type is not None or project_in.target_area_sqkm is not None:
            if existing_reqs:
                latest_req = existing_reqs[-1]
                if project_in.requirements_payload is not None:
                    latest_req.requirements_payload = project_in.requirements_payload
                if project_in.survey_location is not None:
                    latest_req.survey_location = project_in.survey_location
                if project_in.survey_type is not None:
                    latest_req.survey_type = project_in.survey_type
                if project_in.target_area_sqkm is not None:
                    latest_req.target_area_sqkm = project_in.target_area_sqkm
                await db.flush()
            else:
                await request_repository.create_version(
                    db=db,
                    project_id=project.id,
                    version=1,
                    survey_location=project_in.survey_location or "Specified in Survey Scope",
                    survey_type=project_in.survey_type or "topography",
                    target_area_sqkm=project_in.target_area_sqkm,
                    requirements_payload=project_in.requirements_payload or {},
                    created_by=current_user.id,
                )

        updated_project = await project_repository.update(
            db=db,
            project=project,
            title=project_in.title,
            description=project_in.description,
            status=new_status,
            requirements_payload=project_in.requirements_payload,
        )

        # 1. Status Change & Stage Transition Timeline Events
        if new_status is not None and new_status != old_status:
            await project_repository.log_status_history(
                db=db,
                project_id=project.id,
                from_status=old_status,
                to_status=new_status,
                changed_by=current_user.id,
                notes="Draft project submitted for review" if is_client_submitting_draft else f"Status updated from '{old_status.value}' to '{new_status.value}'",
            )

            # Programmatic action and descriptive audit message
            if is_client_submitting_draft:
                action = "request_submitted"
                category = "request"
                message = f"Survey Request submitted for project '{project.title}'"
            elif old_status == ProjectStatusEnum.SUBMITTED and new_status == ProjectStatusEnum.PLANNING:
                action = "stage_advanced_to_planning"
                category = "planning"
                message = f"Survey request accepted by LATRICS Operations; flight planning & feasibility assessment initiated (Stage 2)"
            elif old_status == ProjectStatusEnum.PLANNING and new_status == ProjectStatusEnum.APPROVED:
                action = "request_converted_to_project"
                category = "approval"
                message = f"Survey Request converted to active Project '{project.title}' upon client feasibility agreement; advanced to Stage 3 (Mobilising)"
            elif old_status == ProjectStatusEnum.APPROVED and new_status == ProjectStatusEnum.ACTIVE:
                action = "stage_advanced_to_capturing"
                category = "project"
                message = f"Required mobilisation validations verified: Project '{project.title}' advanced to Stage 4 (Capturing) with active flight operations"
            elif old_status == ProjectStatusEnum.ACTIVE and new_status == ProjectStatusEnum.COMPLETED:
                action = "stage_advanced_to_completed"
                category = "project"
                message = f"Survey deliverables verified: Project '{project.title}' completed and delivered to client (Stage 6)"
            elif new_status == ProjectStatusEnum.CANCELLED:
                action = "project_cancelled"
                category = "project"
                message = f"Project '{project.title}' was marked as cancelled"
            elif new_status == ProjectStatusEnum.ON_HOLD:
                action = "project_on_hold"
                category = "project"
                message = f"Project '{project.title}' was placed on hold"
            else:
                action = "status_updated"
                category = "project"
                message = f"Project '{project.title}' status changed from '{old_status.value}' to '{new_status.value}'"

            await timeline_service.log_event(
                db=db,
                category=category,
                action=action,
                message=message,
                project_id=project.id,
                user_id=current_user.id,
                metadata={"old_status": old_status.value, "new_status": new_status.value},
            )

        # 2. Mobilisation Timeline Events
        if project_in.requirements_payload and "mobilisation" in project_in.requirements_payload:
            new_mob = project_in.requirements_payload["mobilisation"] or {}
            old_mob = old_req_payload.get("mobilisation") or {}

            # Responsibility assignment
            if new_mob.get("responsibility") and new_mob.get("responsibility") != old_mob.get("responsibility"):
                resp_label = "Latrics Operations" if new_mob.get("responsibility") == "LATRICS" else "Client Direct"
                await timeline_service.log_event(
                    db=db,
                    category="mobilisation",
                    action="mobilisation_responsibility_assigned",
                    message=f"Mobilization responsibility assigned to {resp_label} for project '{project.title}'",
                    project_id=project.id,
                    user_id=current_user.id,
                    metadata={"responsibility": new_mob.get("responsibility")},
                )

            # Client ticket deadline declared
            new_deadline = new_mob.get("clientTicketShareDeadline")
            old_deadline = old_mob.get("clientTicketShareDeadline")
            if new_deadline and new_deadline != old_deadline:
                await timeline_service.log_event(
                    db=db,
                    category="mobilisation",
                    action="mobilisation_deadline_declared",
                    message=f"Client committed to share travel tickets & confirmations by {new_deadline} for project '{project.title}'",
                    project_id=project.id,
                    user_id=current_user.id,
                    metadata={"deadline": new_deadline},
                )

            # Client tickets submitted
            new_ticket_status = new_mob.get("clientTicketApprovalStatus")
            old_ticket_status = old_mob.get("clientTicketApprovalStatus")
            if new_ticket_status == "SUBMITTED" and old_ticket_status != "SUBMITTED":
                tickets_count = len(new_mob.get("clientTicketsAndBills") or [])
                await timeline_service.log_event(
                    db=db,
                    category="mobilisation",
                    action="mobilisation_tickets_submitted",
                    message=f"Client uploaded and submitted {tickets_count} travel tickets & booking documents for Operations verification on project '{project.title}'",
                    project_id=project.id,
                    user_id=current_user.id,
                    metadata={"status": "SUBMITTED", "files_count": tickets_count},
                )
            elif new_ticket_status == "APPROVED" and old_ticket_status != "APPROVED":
                await timeline_service.log_event(
                    db=db,
                    category="mobilisation",
                    action="mobilisation_tickets_approved",
                    message=f"Operations approved and validated client travel tickets and bills as genuine for project '{project.title}'",
                    project_id=project.id,
                    user_id=current_user.id,
                    metadata={"status": "APPROVED", "validated_by": str(current_user.id)},
                )
            elif new_ticket_status == "REJECTED" and old_ticket_status != "REJECTED":
                notes = new_mob.get("clientTicketApprovalNotes") or "Clarification required"
                await timeline_service.log_event(
                    db=db,
                    category="mobilisation",
                    action="mobilisation_tickets_rejected",
                    message=f"Operations flagged / requested clarification on client travel tickets for project '{project.title}': {notes}",
                    project_id=project.id,
                    user_id=current_user.id,
                    metadata={"status": "REJECTED", "notes": notes},
                )

            # Latrics advance submission, verification and rejection
            new_adv_status = new_mob.get("latricsAdvancePaymentStatus")
            old_adv_status = old_mob.get("latricsAdvancePaymentStatus")
            if new_adv_status == "SUBMITTED" and old_adv_status != "SUBMITTED":
                utr = new_mob.get("latricsAdvanceUtr") or "Pending"
                await timeline_service.log_event(
                    db=db,
                    category="mobilisation",
                    action="mobilisation_advance_submitted",
                    message=f"Client submitted ₹5,000 mobilization advance deposit transaction slip (UTR: {utr}) for project '{project.title}'",
                    project_id=project.id,
                    user_id=current_user.id,
                    metadata={"status": "SUBMITTED", "utr": utr, "amount": 5000},
                )
            elif new_adv_status == "VERIFIED" and old_adv_status != "VERIFIED":
                await timeline_service.log_event(
                    db=db,
                    category="mobilisation",
                    action="mobilisation_advance_verified",
                    message=f"Operations verified client's ₹5,000 mobilization advance deposit transaction slip for project '{project.title}'",
                    project_id=project.id,
                    user_id=current_user.id,
                    metadata={"status": "VERIFIED", "verified_by": str(current_user.id), "amount": 5000},
                )
            elif new_adv_status == "REJECTED" and old_adv_status != "REJECTED":
                notes = new_mob.get("latricsAdvanceVerificationNotes") or "Invalid slip or transaction unverified"
                await timeline_service.log_event(
                    db=db,
                    category="mobilisation",
                    action="mobilisation_advance_rejected",
                    message=f"Operations flagged / rejected mobilization advance transaction slip for project '{project.title}': {notes}",
                    project_id=project.id,
                    user_id=current_user.id,
                    metadata={"status": "REJECTED", "notes": notes},
                )

        # 3. Document & Boundary Upload Timeline Events
        if project_in.requirements_payload:
            new_payload = project_in.requirements_payload

            # New attachments
            new_atts = new_payload.get("attachments") or []
            old_atts = old_req_payload.get("attachments") or []
            old_names = {a.get("name") for a in old_atts if isinstance(a, dict) and a.get("name")}
            for att in new_atts:
                if isinstance(att, dict) and att.get("name") and att.get("name") not in old_names:
                    await timeline_service.log_event(
                        db=db,
                        category="document",
                        action="document_uploaded",
                        message=f"Uploaded project document '{att.get('name')}' ({att.get('category') or 'Document'}) for project '{project.title}'",
                        project_id=project.id,
                        user_id=current_user.id,
                        metadata={"file_name": att.get("name"), "category": att.get("category"), "size": att.get("size")},
                    )

            # New KML boundary files
            new_kmls = new_payload.get("kml_files") or []
            old_kmls = old_req_payload.get("kml_files") or []
            old_kml_names = {k.get("name") for k in old_kmls if isinstance(k, dict) and k.get("name")}
            for kml in new_kmls:
                if isinstance(kml, dict) and kml.get("name") and kml.get("name") not in old_kml_names:
                    await timeline_service.log_event(
                        db=db,
                        category="document",
                        action="boundary_file_uploaded",
                        message=f"Uploaded survey boundary geospatial file '{kml.get('name')}' for project '{project.title}'",
                        project_id=project.id,
                        user_id=current_user.id,
                        metadata={"file_name": kml.get("name"), "size": kml.get("size")},
                    )

        # 4. Processing Deliverables Timeline Events
        if project_in.requirements_payload and "processing_deliverables" in project_in.requirements_payload:
            new_proc = project_in.requirements_payload["processing_deliverables"] or {}
            old_proc = old_req_payload.get("processing_deliverables") or {}

            new_pre = new_proc.get("pre_processing") or {}
            old_pre = old_proc.get("pre_processing") or {}
            new_post = new_proc.get("post_processing") or {}
            old_post = old_proc.get("post_processing") or {}

            new_links_count = sum(1 for v in {**new_pre, **new_post}.values() if isinstance(v, dict) and v.get("link"))
            old_links_count = sum(1 for v in {**old_pre, **old_post}.values() if isinstance(v, dict) and v.get("link"))

            if new_links_count > old_links_count:
                await timeline_service.log_event(
                    db=db,
                    category="project",
                    action="deliverable_links_updated",
                    message=f"Operations updated download links for {new_links_count} deliverables on project '{project.title}' (Stage 5 Processing)",
                    project_id=project.id,
                    user_id=current_user.id,
                    metadata={"links_count": new_links_count},
                )

            new_ack = (new_proc.get("client_signoff") or {}).get("acknowledged") or new_proc.get("client_acknowledged")
            old_ack = (old_proc.get("client_signoff") or {}).get("acknowledged") or old_proc.get("client_acknowledged")
            if new_ack and not old_ack:
                client_label = getattr(current_user, 'full_name', None) or current_user.email
                await timeline_service.log_event(
                    db=db,
                    category="project",
                    action="deliverables_acknowledged",
                    message=f"Client ({client_label}) verified and acknowledged receipt of all survey deliverables for project '{project.title}'",
                    project_id=project.id,
                    user_id=current_user.id,
                    metadata={"acknowledged_by": client_label},
                )

        return await self._enrich_project(db, updated_project)



project_service = ProjectService()
