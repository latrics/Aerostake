import uuid
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.projects.model import Project, ProjectStatusEnum, ProjectStatusHistory


class ProjectRepository:
    """Raw database operations for Project entities and Status Audit History."""

    async def create(
        self,
        db: AsyncSession,
        title: str,
        description: Optional[str],
        organization_id: uuid.UUID,
        created_by: uuid.UUID,
        client_id: Optional[uuid.UUID] = None,
    ) -> Project:
        project = Project(
            title=title.strip(),
            description=description.strip() if description else None,
            organization_id=organization_id,
            created_by=created_by,
            client_id=client_id or created_by,
            status=ProjectStatusEnum.DRAFT,
        )
        db.add(project)
        await db.flush()
        await db.refresh(project)
        return project

    async def log_status_history(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
        to_status: ProjectStatusEnum,
        from_status: Optional[ProjectStatusEnum] = None,
        changed_by: Optional[uuid.UUID] = None,
        notes: Optional[str] = None,
    ) -> ProjectStatusHistory:
        history = ProjectStatusHistory(
            project_id=project_id,
            from_status=from_status,
            to_status=to_status,
            changed_by=changed_by,
            notes=notes,
        )
        db.add(history)
        await db.flush()
        await db.refresh(history)
        return history

    async def get_by_id(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
    ) -> Optional[Project]:
        stmt = select(Project).where(Project.id == project_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_organization(
        self,
        db: AsyncSession,
        organization_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Project]:
        stmt = (
            select(Project)
            .where(Project.organization_id == organization_id)
            .order_by(Project.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def list_by_client(
        self,
        db: AsyncSession,
        client_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Project]:
        stmt = (
            select(Project)
            .where(Project.client_id == client_id)
            .order_by(Project.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def list_all(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        status: Optional[ProjectStatusEnum] = None,
    ) -> List[Project]:
        stmt = select(Project).order_by(Project.created_at.desc()).offset(skip).limit(limit)
        if status is not None:
            stmt = stmt.where(Project.status == status)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def update(
        self,
        db: AsyncSession,
        project: Project,
        title: Optional[str] = None,
        description: Optional[str] = None,
        status: Optional[ProjectStatusEnum] = None,
        requirements_payload: Optional[dict] = None,
    ) -> Project:
        if title is not None:
            project.title = title.strip()
        if description is not None:
            project.description = description.strip()
        if status is not None:
            project.status = status
        if requirements_payload is not None:
            project.requirements_payload = requirements_payload
        await db.flush()
        await db.refresh(project)
        return project


project_repository = ProjectRepository()
