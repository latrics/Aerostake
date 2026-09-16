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
            category="project",
            action="project_created",
            message=f"Project '{project.title}' initialized by {current_user.email}",
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
            if not has_org_access and not has_user_access:
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

        # Synchronize requirements_payload, survey_location, survey_type onto latest request version
        if project_in.requirements_payload is not None or project_in.survey_location is not None or project_in.survey_type is not None or project_in.target_area_sqkm is not None:
            reqs = await request_repository.list_by_project(db, project.id)
            if reqs:
                latest_req = reqs[-1]
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

        if new_status is not None and new_status != old_status:
            # 1. Audit status change in project_status_history
            await project_repository.log_status_history(
                db=db,
                project_id=project.id,
                from_status=old_status,
                to_status=new_status,
                changed_by=current_user.id,
                notes="Draft project submitted for review" if is_client_submitting_draft else f"Status updated from '{old_status.value}' to '{new_status.value}'",
            )

            # 2. Timeline event
            await timeline_service.log_event(
                db=db,
                category="request" if is_client_submitting_draft else "project",
                action="request_submitted" if is_client_submitting_draft else "status_updated",
                message=f"Survey Request submitted for project '{project.title}'" if is_client_submitting_draft else f"Project '{project.title}' status changed from '{old_status.value}' to '{new_status.value}'",
                project_id=project.id,
                user_id=current_user.id,
                metadata={"old_status": old_status.value, "new_status": new_status.value},
            )

        return await self._enrich_project(db, updated_project)



project_service = ProjectService()
