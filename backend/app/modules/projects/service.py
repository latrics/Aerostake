import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.projects.model import Project, ProjectStatusEnum
from app.modules.projects.repository import project_repository
from app.modules.projects.schema import ProjectCreate, ProjectUpdate
from app.modules.timeline.service import timeline_service
from app.modules.users.model import RoleEnum, User


class ProjectService:
    """Business logic and ownership enforcement for Projects."""

    async def create_project(
        self,
        db: AsyncSession,
        current_user: User,
        project_in: ProjectCreate,
    ) -> Project:
        project = await project_repository.create(
            db=db,
            title=project_in.title,
            description=project_in.description,
            client_id=current_user.id,
        )

        # Log timeline event
        await timeline_service.log_event(
            db=db,
            category="project",
            action="project_created",
            message=f"Project '{project.title}' created by {current_user.email}",
            project_id=project.id,
            user_id=current_user.id,
            metadata={"status": project.status.value},
        )

        return project

    async def get_project(
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

        # Ownership and RBAC check: Clients can only access their own projects
        if current_user.role == RoleEnum.CLIENT and project.client_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this project",
            )

        return project

    async def list_projects(
        self,
        db: AsyncSession,
        current_user: User,
        status_filter: Optional[ProjectStatusEnum] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Project]:
        if current_user.role == RoleEnum.CLIENT:
            return await project_repository.list_by_client(
                db=db,
                client_id=current_user.id,
                skip=skip,
                limit=limit,
            )
        # Admin, Operations, Pilot can list all projects
        return await project_repository.list_all(
            db=db,
            skip=skip,
            limit=limit,
            status=status_filter,
        )

    async def update_project(
        self,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
        project_in: ProjectUpdate,
    ) -> Project:
        project = await self.get_project(db, current_user, project_id)
        old_status = project.status

        # Only Admin or Operations can manually change status via patch endpoint
        new_status = project_in.status
        if new_status is not None and new_status != old_status:
            if current_user.role not in [RoleEnum.ADMIN, RoleEnum.OPERATIONS]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only Admin or Operations staff can manually update project status",
                )

        updated_project = await project_repository.update(
            db=db,
            project=project,
            title=project_in.title,
            description=project_in.description,
            status=new_status,
        )

        if new_status is not None and new_status != old_status:
            await timeline_service.log_event(
                db=db,
                category="project",
                action="status_updated",
                message=f"Project '{project.title}' status changed from '{old_status.value}' to '{new_status.value}'",
                project_id=project.id,
                user_id=current_user.id,
                metadata={"old_status": old_status.value, "new_status": new_status.value},
            )

        return updated_project


project_service = ProjectService()
