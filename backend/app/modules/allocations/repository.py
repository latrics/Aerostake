import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.allocations.model import AllocationStatusEnum, SectorAllocation


class AllocationRepository:
    """Raw database operations for SectorAllocation entities."""

    async def create_allocation(
        self,
        db: AsyncSession,
        sector_id: uuid.UUID,
        project_id: uuid.UUID,
        pilot_id: uuid.UUID,
        drone_model: str,
        drone_serial_number: str,
        assigned_by: uuid.UUID,
    ) -> SectorAllocation:
        allocation = SectorAllocation(
            sector_id=sector_id,
            project_id=project_id,
            pilot_id=pilot_id,
            drone_model=drone_model.strip(),
            drone_serial_number=drone_serial_number.strip().upper(),
            status=AllocationStatusEnum.ASSIGNED,
            assigned_by=assigned_by,
        )
        db.add(allocation)
        await db.flush()
        await db.refresh(allocation)
        return allocation

    async def get_by_id(
        self,
        db: AsyncSession,
        allocation_id: uuid.UUID,
    ) -> Optional[SectorAllocation]:
        stmt = select(SectorAllocation).where(SectorAllocation.id == allocation_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_active_by_sector(
        self,
        db: AsyncSession,
        sector_id: uuid.UUID,
    ) -> Optional[SectorAllocation]:
        stmt = (
            select(SectorAllocation)
            .where(
                SectorAllocation.sector_id == sector_id,
                SectorAllocation.status.in_([
                    AllocationStatusEnum.ASSIGNED,
                    AllocationStatusEnum.ACCEPTED,
                    AllocationStatusEnum.IN_FLIGHT,
                ])
            )
            .order_by(SectorAllocation.allocated_at.desc())
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_pilot(
        self,
        db: AsyncSession,
        pilot_id: uuid.UUID,
    ) -> List[SectorAllocation]:
        stmt = (
            select(SectorAllocation)
            .where(SectorAllocation.pilot_id == pilot_id)
            .order_by(SectorAllocation.allocated_at.desc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def list_by_project(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
    ) -> List[SectorAllocation]:
        stmt = (
            select(SectorAllocation)
            .where(SectorAllocation.project_id == project_id)
            .order_by(SectorAllocation.allocated_at.desc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def update_status(
        self,
        db: AsyncSession,
        allocation: SectorAllocation,
        new_status: AllocationStatusEnum,
    ) -> SectorAllocation:
        allocation.status = new_status
        if new_status == AllocationStatusEnum.COMPLETED:
            allocation.completed_at = datetime.now(timezone.utc)
        await db.flush()
        await db.refresh(allocation)
        return allocation


allocation_repository = AllocationRepository()
