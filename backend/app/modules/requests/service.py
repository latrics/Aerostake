import uuid
from typing import List
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.notifications.service import notification_service
from app.modules.projects.model import ProjectStatusEnum
from app.modules.projects.repository import project_repository
from app.modules.projects.service import project_service
from app.modules.requests.model import RequestVersion
from app.modules.requests.repository import request_repository
from app.modules.requests.schema import RequestVersionCreate
from app.modules.timeline.service import timeline_service
from app.modules.users.model import RoleEnum, User
from app.modules.users.repository import user_repository


class RequestService:
    """Business logic for immutable versioned survey request submissions."""

    async def submit_request(
        self,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
        request_in: RequestVersionCreate,
    ) -> RequestVersion:
        # Verify project exists and user has access permission
        project = await project_service.get_project(db, current_user, project_id)

        # Disallow new request submission if project is already completed or cancelled
        if project.status in [ProjectStatusEnum.COMPLETED, ProjectStatusEnum.CANCELLED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot submit new request version for project in '{project.status.value}' state",
            )

        latest_version = await request_repository.get_latest_version_number(db, project_id)
        new_version_num = latest_version + 1

        request_version = await request_repository.create_version(
            db=db,
            project_id=project_id,
            version=new_version_num,
            survey_location=request_in.survey_location,
            survey_type=request_in.survey_type,
            target_area_sqkm=request_in.target_area_sqkm,
            requirements_payload=request_in.requirements_payload,
            created_by=current_user.id,
        )

        # Transition project status to SUBMITTED
        await project_repository.update(
            db=db,
            project=project,
            status=ProjectStatusEnum.SUBMITTED,
        )

        # Log timeline event
        await timeline_service.log_event(
            db=db,
            category="request",
            action="request_submitted",
            message=f"Submitted Request #{new_version_num:03d} for project '{project.title}'",
            project_id=project.id,
            user_id=current_user.id,
            metadata={
                "version": new_version_num,
                "survey_location": request_in.survey_location,
                "survey_type": request_in.survey_type,
                "target_area_sqkm": request_in.target_area_sqkm,
            },
        )

        # Dispatch async notification alert to client
        await notification_service.send_email(
            to_email=current_user.email,
            subject=f"Request #{new_version_num:03d} Received: {project.title}",
            html_content=f"<p>Thank you. Your request version #{new_version_num:03d} for <b>{project.title}</b> has been received and queued for operational planning.</p>",
        )
        if current_user.device_token:
            await notification_service.send_push(
                device_token=current_user.device_token,
                title=f"Request #{new_version_num:03d} Confirmed",
                body=f"Survey request for '{project.title}' queued for operational planning.",
                data={"project_id": str(project.id), "version": str(new_version_num)},
            )

        # Notify Ops team
        ops_users = await user_repository.get_users_by_roles(db, [RoleEnum.ADMIN, RoleEnum.OPERATIONS])
        for staff in ops_users:
            await notification_service.send_email(
                to_email=staff.email,
                subject=f"New Survey Request: {project.title} (#{new_version_num:03d})",
                html_content=f"<p>A new survey request version #{new_version_num:03d} was submitted for <b>{project.title}</b> at location <i>{request_in.survey_location}</i> ({request_in.target_area_sqkm} sq km). Ready for quotation drafting.</p>",
            )
            if staff.device_token:
                await notification_service.send_push(
                    device_token=staff.device_token,
                    title=f"New Survey Request: {project.title}",
                    body=f"Request #{new_version_num:03d} at {request_in.survey_location} ({request_in.target_area_sqkm} sq km).",
                    data={"project_id": str(project.id), "request_id": str(request_version.id), "action": "draft_plan"},
                )

        return request_version

    async def list_project_requests(
        self,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
    ) -> List[RequestVersion]:
        # Ownership / RBAC validation
        await project_service.get_project(db, current_user, project_id)
        return await request_repository.list_by_project(db, project_id)

    async def get_project_request_by_version(
        self,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
        version: int,
    ) -> RequestVersion:
        # Ownership / RBAC validation
        await project_service.get_project(db, current_user, project_id)
        request_ver = await request_repository.get_by_version(db, project_id, version)
        if not request_ver:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Request version #{version} not found for this project",
            )
        return request_ver


request_service = RequestService()
