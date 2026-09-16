import asyncio
import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal, engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aerostake.db_wipe")


# Dependency-safe list of tables to truncate (or execute with CASCADE)
TABLES_IN_DEPENDENCY_ORDER = [
    "payment_records",
    "sector_allocations",
    "sectors",
    "operational_plans",
    "request_versions",
    "project_status_history",
    "timeline_events",
    "projects",
    "invitations",
    "users",
    "organizations",
]


async def wipe_database(db: AsyncSession | None = None) -> None:
    """Safely wipe all existing data across all application tables.

    Uses TRUNCATE ... CASCADE in reverse dependency order. Re-runnable at any time
    during development without violating foreign key constraints.
    """
    logger.info("🧨 Starting database wipe (TRUNCATE ... CASCADE)...")

    async def _execute_wipe(session: AsyncSession):
        # Truncate tables with cascade
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
    asyncio.run(wipe_database())
