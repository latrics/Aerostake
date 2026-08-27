import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.sectors.model import Sector, SectorStatusEnum
from app.modules.sectors.schema import SectorCreate


class SectorRepository:
    """Raw database operations for the Sector entity."""

    async def create(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
        plan_id: uuid.UUID,
        sector_code: str,
        polygon_coordinates: Optional[Dict[str, Any]] = None,
        target_area_sqkm: Optional[float] = None,
        estimated_flight_minutes: Optional[int] = None,
    ) -> Sector:
        sector = Sector(
            project_id=project_id,
            plan_id=plan_id,
            sector_code=sector_code.strip().upper(),
            polygon_coordinates=polygon_coordinates or {},
            target_area_sqkm=target_area_sqkm,
            estimated_flight_minutes=estimated_flight_minutes,
            status=SectorStatusEnum.PENDING,
        )
        db.add(sector)
        await db.flush()
        await db.refresh(sector)
        return sector

    async def bulk_create(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
        plan_id: uuid.UUID,
        sectors_in: List[SectorCreate],
    ) -> List[Sector]:
        created = []
        for s_in in sectors_in:
            sector = Sector(
                project_id=project_id,
                plan_id=plan_id,
                sector_code=s_in.sector_code.strip().upper(),
                polygon_coordinates=s_in.polygon_coordinates or {},
                target_area_sqkm=s_in.target_area_sqkm,
                estimated_flight_minutes=s_in.estimated_flight_minutes,
                status=SectorStatusEnum.PENDING,
            )
            db.add(sector)
            created.append(sector)
        await db.flush()
        for s in created:
            await db.refresh(s)
        return created

    async def get_by_id(
        self,
        db: AsyncSession,
        sector_id: uuid.UUID,
    ) -> Optional[Sector]:
        stmt = select(Sector).where(Sector.id == sector_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_project(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
    ) -> List[Sector]:
        stmt = (
            select(Sector)
            .where(Sector.project_id == project_id)
            .order_by(Sector.sector_code.asc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def list_by_plan(
        self,
        db: AsyncSession,
        plan_id: uuid.UUID,
    ) -> List[Sector]:
        stmt = (
            select(Sector)
            .where(Sector.plan_id == plan_id)
            .order_by(Sector.sector_code.asc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def update_status(
        self,
        db: AsyncSession,
        sector: Sector,
        new_status: SectorStatusEnum,
    ) -> Sector:
        sector.status = new_status
        await db.flush()
        await db.refresh(sector)
        return sector


sector_repository = SectorRepository()
