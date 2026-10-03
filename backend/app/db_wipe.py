import asyncio
import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal, engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aerostake.db_wipe")


# Dependency-safe list of tables to truncate (or execute with CASCADE)
OPERATIONAL_TABLES = [
    "payment_records",
    "sector_allocations",
    "sectors",
    "operational_plans",
    "planning_drafts",
    "planning_form_versions",
    "request_versions",
    "project_status_history",
    "timeline_events",
    "projects",
]

TABLES_IN_DEPENDENCY_ORDER = [
    *OPERATIONAL_TABLES,
    "invitations",
    "users",
    "organizations",
]


async def wipe_operational_data(db: AsyncSession | None = None) -> None:
    """Safely wipe operational, project, request, and planning data while preserving users and organizations."""
    logger.info("🧨 Starting operational database wipe (preserving users & organizations)...")

    async def _execute_wipe(session: AsyncSession):
        truncate_stmt = f"TRUNCATE TABLE {', '.join(OPERATIONAL_TABLES)} RESTART IDENTITY CASCADE;"
        await session.execute(text(truncate_stmt))
        await session.commit()
        logger.info("  ✨ All operational tables successfully truncated.")

    if db is not None:
        await _execute_wipe(db)
    else:
        async with AsyncSessionLocal() as session:
            await _execute_wipe(session)


async def wipe_database(db: AsyncSession | None = None) -> None:
    """Safely wipe all existing data across all application tables.

    Uses TRUNCATE ... CASCADE in reverse dependency order. Re-runnable at any time
    during development without violating foreign key constraints.
    """
    logger.info("🧨 Starting database wipe (TRUNCATE ... CASCADE)...")

    async def _execute_wipe(session: AsyncSession):
        truncate_stmt = f"TRUNCATE TABLE {', '.join(TABLES_IN_DEPENDENCY_ORDER)} RESTART IDENTITY CASCADE;"
        await session.execute(text(truncate_stmt))
        await session.commit()
        logger.info("  ✨ All tables successfully truncated in dependency-safe order.")

    if db is not None:
        await _execute_wipe(db)
    else:
        async with AsyncSessionLocal() as session:
            await _execute_wipe(session)


if __name__ == "__main__":
    import sys
    if "--operational-only" in sys.argv:
        asyncio.run(wipe_operational_data())
    else:
        asyncio.run(wipe_database())
