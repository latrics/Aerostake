import uuid
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.projects.model import Project, ProjectStatusEnum


class ProjectRepository:
    """Raw database operations for the Project entity."""

    async def create(
        self,
        db: AsyncSession,
        title: str,
        description: Optional[str],
        client_id: uuid.UUID,
    ) -> Project:
        project = Project(
            title=title.strip(),
            description=description.strip() if description else None,
            client_id=client_id,
            status=ProjectStatusEnum.DRAFT,
        )
        db.add(project)
        await db.flush()
        await db.refresh(project)
        return project

    async def get_by_id(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
    ) -> Optional[Project]:
        stmt = select(Project).where(Project.id == project_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

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
    ) -> Project:
        if title is not None:
            project.title = title.strip()
        if description is not None:
            project.description = description.strip()
        if status is not None:
            project.status = status
        await db.flush()
        await db.refresh(project)
        return project


project_repository = ProjectRepository()
