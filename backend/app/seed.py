import asyncio
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.modules.allocations.model import AllocationStatusEnum, SectorAllocation
from app.modules.payments.model import PaymentRecord, PaymentStatusEnum
from app.modules.planning.model import OperationalPlan, PlanStatusEnum
from app.modules.projects.model import Project, ProjectStatusEnum
from app.modules.requests.model import RequestVersion
from app.modules.sectors.model import Sector, SectorStatusEnum
from app.modules.timeline.model import TimelineEvent
from app.modules.users.model import RoleEnum, User
from app.security.auth import hash_password

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aerostake.seed")


async def seed_database():
    """Seed the database with default role users and a complete end-to-end survey project lifecycle."""
    logger.info("🌱 Starting Aerostake database seed...")

    async with AsyncSessionLocal() as db:
        # 1. Seed Default Role Users
        default_users = [
            {"email": "admin@latrics.com", "role": RoleEnum.ADMIN, "full_name": "Latrics Executive Admin"},
            {"email": "ops@latrics.com", "role": RoleEnum.OPERATIONS, "full_name": "Latrics Survey Operations Lead"},
            {"email": "pilot@latrics.com", "role": RoleEnum.PILOT, "full_name": "Capt. John Pilot"},
            {"email": "client@latrics.com", "role": RoleEnum.CLIENT, "full_name": "Apex Clean Energy Corp"},
        ]

        user_entities = {}
        for u_data in default_users:
            stmt = select(User).where(User.email == u_data["email"])
            res = await db.execute(stmt)
            user = res.scalar_one_or_none()
            if not user:
                user = User(
                    email=u_data["email"],
                    hashed_password=hash_password("Password123!"),
                    role=u_data["role"],
                    is_active=True,
                )
                db.add(user)
                await db.flush()
                await db.refresh(user)
                logger.info(f"  👤 Created user: {u_data['email']} ({u_data['role'].value})")
            user_entities[u_data["role"]] = user

        client_user = user_entities[RoleEnum.CLIENT]
        ops_user = user_entities[RoleEnum.OPERATIONS]
        admin_user = user_entities[RoleEnum.ADMIN]
        pilot_user = user_entities[RoleEnum.PILOT]

        # 2. Check if Demo Project already exists
        stmt_proj = select(Project).where(Project.title == "Solar Photovoltaic Thermal Inspection")
        res_proj = await db.execute(stmt_proj)
        demo_project = res_proj.scalar_one_or_none()

        if not demo_project:
            logger.info("  🚀 Creating full-lifecycle Demo Project...")

            # A. Create Project Container
            demo_project = Project(
                title="Solar Photovoltaic Thermal Inspection",
                description="High-resolution orthomosaic and FLIR radiometric thermal survey of 500MW solar park.",
                client_id=client_user.id,
                status=ProjectStatusEnum.ACTIVE,
            )
            db.add(demo_project)
            await db.flush()
            await db.refresh(demo_project)

            # B. Create Request Version #001
            req_ver = RequestVersion(
                project_id=demo_project.id,
                version=1,
                survey_location="Jaisalmer Solar Park, Rajasthan, India",
                survey_type="thermal_radiometric",
                target_area_sqkm=2.5,
                requirements_payload={
                    "resolution_cm_per_px": 2.5,
                    "sensor_type": "FLIR Vue Pro R Radiometric",
                    "deliverables": ["GeoTIFF Orthomosaic", "Thermal Heat Anomaly Report", "KMZ Grid"],
                },
                created_by=client_user.id,
            )
            db.add(req_ver)
            await db.flush()
            await db.refresh(req_ver)

            # C. Create & Publish Operational Plan
            plan = OperationalPlan(
                project_id=demo_project.id,
                request_version_id=req_ver.id,
                status=PlanStatusEnum.PUBLISHED,
                estimated_flight_hours=16.0,
                required_pilots_count=2,
                required_drones_count=2,
                estimated_cost_usd=7200.0,
                flight_strategy_notes="Dual crew thermal survey executed between 11:00 AM and 2:00 PM for peak solar irradiance.",
                published_by=ops_user.id,
                published_at=datetime.now(timezone.utc),
            )
            db.add(plan)
            await db.flush()
            await db.refresh(plan)

            # D. Subdivide Sectors
            sector_a1 = Sector(
                project_id=demo_project.id,
                plan_id=plan.id,
                sector_code="SEC-A1",
                status=SectorStatusEnum.IN_PROGRESS,
                polygon_coordinates={
                    "type": "Polygon",
                    "coordinates": [[[71.192, 26.912], [71.198, 26.912], [71.198, 26.918], [71.192, 26.918], [71.192, 26.912]]],
                },
                target_area_sqkm=1.25,
                estimated_flight_minutes=45,
            )
            sector_a2 = Sector(
                project_id=demo_project.id,
                plan_id=plan.id,
                sector_code="SEC-A2",
                status=SectorStatusEnum.PENDING,
                polygon_coordinates={
                    "type": "Polygon",
                    "coordinates": [[[71.198, 26.912], [71.204, 26.912], [71.204, 26.918], [71.198, 26.918], [71.198, 26.912]]],
                },
                target_area_sqkm=1.25,
                estimated_flight_minutes=45,
            )
            db.add(sector_a1)
            db.add(sector_a2)
            await db.flush()
            await db.refresh(sector_a1)
            await db.refresh(sector_a2)

            # E. Allocate Pilot and Drone Hardware to Sector SEC-A1
            allocation = SectorAllocation(
                sector_id=sector_a1.id,
                project_id=demo_project.id,
                pilot_id=pilot_user.id,
                drone_model="DJI Matrice 300 RTK",
                drone_serial_number="M300-8849-AF",
                status=AllocationStatusEnum.IN_FLIGHT,
                assigned_by=ops_user.id,
            )
            db.add(allocation)
            await db.flush()
            await db.refresh(allocation)

            # F. Create Milestone Payment & Verified Receipt
            payment = PaymentRecord(
                project_id=demo_project.id,
                milestone_name="Initial Mobilization Deposit (50%)",
                amount_usd=3600.0,
                status=PaymentStatusEnum.VERIFIED,
                payment_method="Wire Transfer",
                reference_code="UTR-WIRE-992211",
                notes="50% deposit received via Chase Commercial Wire remittance.",
                verified_by=admin_user.id,
                verified_at=datetime.now(timezone.utc),
            )
            db.add(payment)
            await db.flush()
            await db.refresh(payment)

            # G. Create Full Audit Timeline Events
            timeline_events = [
                TimelineEvent(
                    project_id=demo_project.id,
                    user_id=client_user.id,
                    category="request",
                    action="project_created",
                    message="Client created project 'Solar Photovoltaic Thermal Inspection'",
                ),
                TimelineEvent(
                    project_id=demo_project.id,
                    user_id=client_user.id,
                    category="request",
                    action="request_submitted",
                    message="Client submitted Request Version #001 (2.5 sq km)",
                    event_metadata={"version": 1},
                ),
                TimelineEvent(
                    project_id=demo_project.id,
                    user_id=ops_user.id,
                    category="planning",
                    action="plan_published",
                    message="Ops published operational flight plan ($7,200.00)",
                    event_metadata={"plan_id": str(plan.id), "cost_usd": 7200.0},
                ),
                TimelineEvent(
                    project_id=demo_project.id,
                    user_id=client_user.id,
                    category="approval",
                    action="plan_approved",
                    message="Client approved operational plan and quotation",
                ),
                TimelineEvent(
                    project_id=demo_project.id,
                    user_id=ops_user.id,
                    category="allocation",
                    action="sectors_created",
                    message="Subdivided survey area into 2 grid sectors (SEC-A1, SEC-A2)",
                ),
                TimelineEvent(
                    project_id=demo_project.id,
                    user_id=ops_user.id,
                    category="allocation",
                    action="pilot_allocated",
                    message="Allocated Capt. John Pilot with DJI Matrice 300 RTK to Sector SEC-A1",
                    event_metadata={"sector_id": str(sector_a1.id), "pilot_id": str(pilot_user.id)},
                ),
                TimelineEvent(
                    project_id=demo_project.id,
                    user_id=admin_user.id,
                    category="payment",
                    action="payment_verified",
                    message="Admin verified wire payment of $3,600.00 for Initial Mobilization Deposit",
                    event_metadata={"reference_code": "UTR-WIRE-992211"},
                ),
                TimelineEvent(
                    project_id=demo_project.id,
                    user_id=pilot_user.id,
                    category="execution",
                    action="flight_status_updated",
                    message="Pilot Capt. John Pilot launched drone flight over Sector SEC-A1",
                    event_metadata={"status": "in_flight"},
                ),
            ]
            db.add_all(timeline_events)
            await db.commit()
            logger.info("  ✅ Full lifecycle Demo Project and Timeline seeded successfully!")
        else:
            logger.info("  ℹ️ Demo project already present; skipping project generation.")

    logger.info("✨ Database seeding complete!")


if __name__ == "__main__":
    asyncio.run(seed_database())
