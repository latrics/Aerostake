import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.requests.model import RequestVersion


class RequestRepository:
    """Raw database operations for immutable RequestVersion records."""

    async def get_latest_version_number(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
    ) -> int:
        stmt = select(func.coalesce(func.max(RequestVersion.version), 0)).where(
            RequestVersion.project_id == project_id
        )
        result = await db.execute(stmt)
        return result.scalar_one()

    async def create_version(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
        version: int,
        survey_location: str,
        survey_type: str,
        target_area_sqkm: Optional[float],
        requirements_payload: Optional[Dict[str, Any]],
        created_by: Optional[uuid.UUID],
    ) -> RequestVersion:
        request_version = RequestVersion(
            project_id=project_id,
            version=version,
            survey_location=survey_location.strip(),
            survey_type=survey_type.strip(),
            target_area_sqkm=target_area_sqkm,
            requirements_payload=requirements_payload or {},
            created_by=created_by,
        )
        db.add(request_version)
        await db.flush()
        await db.refresh(request_version)
        return request_version

    async def list_by_project(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
    ) -> List[RequestVersion]:
        stmt = (
            select(RequestVersion)
            .where(RequestVersion.project_id == project_id)
            .order_by(RequestVersion.version.asc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_by_version(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
        version: int,
    ) -> Optional[RequestVersion]:
        stmt = select(RequestVersion).where(
            RequestVersion.project_id == project_id,
            RequestVersion.version == version,
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()


request_repository = RequestRepository()
