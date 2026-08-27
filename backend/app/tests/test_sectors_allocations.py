import pytest
import uuid
from unittest.mock import patch
from fastapi.testclient import TestClient

from app.main import app
from app.modules.allocations.model import AllocationStatusEnum, SectorAllocation
from app.modules.planning.model import OperationalPlan, PlanStatusEnum
from app.modules.projects.model import Project, ProjectStatusEnum
from app.modules.sectors.model import Sector, SectorStatusEnum
from app.modules.timeline.model import TimelineEvent
from app.modules.users.model import RoleEnum, User
from app.security.jwt import create_access_token

client = TestClient(app)

# In-memory mock store
mock_users = {}
mock_projects = {}
mock_plans = {}
mock_sectors = {}
mock_allocations = {}
mock_timeline = []


class MockUserRepo:
    async def get_by_id(self, db, user_id):
        return mock_users.get(str(user_id))

    async def get_by_email(self, db, email):
        for u in mock_users.values():
            if u.email == email:
                return u
        return None


class MockProjectRepo:
    async def get_by_id(self, db, project_id):
        return mock_projects.get(str(project_id))

    async def update(self, db, project, title=None, description=None, status=None):
        if status is not None:
            project.status = status
        mock_projects[str(project.id)] = project
        return project


class MockPlanningRepo:
    async def get_by_id(self, db, plan_id):
        return mock_plans.get(str(plan_id))


class MockSectorRepo:
    async def bulk_create(self, db, project_id, plan_id, sectors_in):
        created = []
        for s_in in sectors_in:
            s_id = uuid.uuid4()
            sector = Sector(
                id=s_id,
                project_id=project_id,
                plan_id=plan_id,
                sector_code=s_in.sector_code,
                polygon_coordinates=s_in.polygon_coordinates,
                target_area_sqkm=s_in.target_area_sqkm,
                estimated_flight_minutes=s_in.estimated_flight_minutes,
                status=SectorStatusEnum.PENDING,
            )
            mock_sectors[str(s_id)] = sector
            created.append(sector)
        return created

    async def get_by_id(self, db, sector_id):
        return mock_sectors.get(str(sector_id))

    async def list_by_project(self, db, project_id):
        return [s for s in mock_sectors.values() if s.project_id == project_id]

    async def update_status(self, db, sector, new_status):
        sector.status = new_status
        mock_sectors[str(sector.id)] = sector
        return sector


class MockAllocationRepo:
    async def create_allocation(
        self, db, sector_id, project_id, pilot_id, drone_model, drone_serial_number, assigned_by
    ):
        alloc_id = uuid.uuid4()
        alloc = SectorAllocation(
            id=alloc_id,
            sector_id=sector_id,
            project_id=project_id,
            pilot_id=pilot_id,
            drone_model=drone_model,
            drone_serial_number=drone_serial_number,
            status=AllocationStatusEnum.ASSIGNED,
            assigned_by=assigned_by,
        )
        mock_allocations[str(alloc_id)] = alloc
        return alloc

    async def get_by_id(self, db, allocation_id):
        return mock_allocations.get(str(allocation_id))

    async def get_active_by_sector(self, db, sector_id):
        for a in mock_allocations.values():
            if a.sector_id == sector_id and a.status in [
                AllocationStatusEnum.ASSIGNED,
                AllocationStatusEnum.ACCEPTED,
                AllocationStatusEnum.IN_FLIGHT,
            ]:
                return a
        return None

    async def list_by_pilot(self, db, pilot_id):
        return [a for a in mock_allocations.values() if a.pilot_id == pilot_id]

    async def update_status(self, db, allocation, new_status):
        allocation.status = new_status
        mock_allocations[str(allocation.id)] = allocation
        return allocation


class MockTimelineService:
    async def log_event(
        self, db, category, action, message, project_id=None, user_id=None, metadata=None
    ):
        event = TimelineEvent(
            id=uuid.uuid4(),
            project_id=project_id,
            user_id=user_id,
            category=category,
            action=action,
            message=message,
            event_metadata=metadata or {},
        )
        mock_timeline.append(event)
        return event


async def mock_async_send(**kw):
    return True


def test_sectors_and_allocations_full_lifecycle():
    # 1. Setup Test Users: Client, Ops Manager, Licensed Pilot
    client_id = uuid.uuid4()
    client_user = User(id=client_id, email="client@latrics.com", role=RoleEnum.CLIENT, is_active=True)
    mock_users[str(client_id)] = client_user

    ops_id = uuid.uuid4()
    ops_user = User(id=ops_id, email="ops@latrics.com", role=RoleEnum.OPERATIONS, is_active=True)
    mock_users[str(ops_id)] = ops_user

    pilot_id = uuid.uuid4()
    pilot_user = User(id=pilot_id, email="pilot@latrics.com", role=RoleEnum.PILOT, is_active=True)
    mock_users[str(pilot_id)] = pilot_user

    client_token = create_access_token({"sub": str(client_id), "email": client_user.email, "role": "client"})
    ops_token = create_access_token({"sub": str(ops_id), "email": ops_user.email, "role": "operations"})
    pilot_token = create_access_token({"sub": str(pilot_id), "email": pilot_user.email, "role": "pilot"})

    # 2. Setup Unapproved Draft Project
    draft_project_id = uuid.uuid4()
    draft_project = Project(
        id=draft_project_id,
        title="Unapproved Draft Survey",
        client_id=client_id,
        status=ProjectStatusEnum.DRAFT,
    )
    mock_projects[str(draft_project_id)] = draft_project

    # 3. Setup Approved Project with Published Plan
    approved_project_id = uuid.uuid4()
    approved_project = Project(
        id=approved_project_id,
        title="Thermal Solar Farm Survey",
        client_id=client_id,
        status=ProjectStatusEnum.APPROVED,
    )
    mock_projects[str(approved_project_id)] = approved_project

    plan_id = uuid.uuid4()
    plan = OperationalPlan(
        id=plan_id,
        project_id=approved_project_id,
        request_version_id=uuid.uuid4(),
        status=PlanStatusEnum.PUBLISHED,
        estimated_flight_hours=12.0,
        required_pilots_count=2,
        required_drones_count=2,
        estimated_cost_usd=5000.0,
    )
    mock_plans[str(plan_id)] = plan

    with patch("app.security.auth.user_repository", MockUserRepo()), \
         patch("app.modules.sectors.service.project_repository", MockProjectRepo()), \
         patch("app.modules.sectors.service.planning_repository", MockPlanningRepo()), \
         patch("app.modules.sectors.service.sector_repository", MockSectorRepo()), \
         patch("app.modules.sectors.service.timeline_service.log_event", MockTimelineService().log_event), \
         patch("app.modules.allocations.service.project_repository", MockProjectRepo()), \
         patch("app.modules.allocations.service.sector_repository", MockSectorRepo()), \
         patch("app.modules.allocations.service.allocation_repository", MockAllocationRepo()), \
         patch("app.modules.allocations.service.user_repository", MockUserRepo()), \
         patch("app.modules.allocations.service.timeline_service.log_event", MockTimelineService().log_event), \
         patch("app.modules.allocations.service.notification_service.send_email", mock_async_send), \
         patch("app.modules.allocations.service.notification_service.send_push", mock_async_send), \
         patch("app.modules.projects.service.project_repository", MockProjectRepo()):

        # 4. Guard Test: Attempting to create sectors on unapproved project fails with 400 Bad Request
        unapproved_sector_res = client.post(
            f"/projects/{draft_project_id}/sectors",
            headers={"Authorization": f"Bearer {ops_token}"},
            json={
                "plan_id": str(plan_id),
                "sectors": [{"sector_code": "SEC-A1"}]
            }
        )
        assert unapproved_sector_res.status_code == 400

        # 5. Ops creates 2 Sectors on Approved Project
        sectors_res = client.post(
            f"/projects/{approved_project_id}/sectors",
            headers={"Authorization": f"Bearer {ops_token}"},
            json={
                "plan_id": str(plan_id),
                "sectors": [
                    {
                        "sector_code": "SEC-A1",
                        "target_area_sqkm": 0.5,
                        "estimated_flight_minutes": 25,
                        "polygon_coordinates": {"coordinates": [[[71.1, 26.9], [71.2, 26.9], [71.2, 27.0], [71.1, 27.0]]]}
                    },
                    {
                        "sector_code": "SEC-A2",
                        "target_area_sqkm": 0.6,
                        "estimated_flight_minutes": 30,
                        "polygon_coordinates": {"coordinates": [[[71.2, 26.9], [71.3, 26.9], [71.3, 27.0], [71.2, 27.0]]]}
                    }
                ]
            }
        )
        assert sectors_res.status_code == 201
        sectors_data = sectors_res.json()
        assert len(sectors_data) == 2
        sec_a1_id = sectors_data[0]["id"]
        assert sectors_data[0]["sector_code"] == "SEC-A1"
        assert sectors_data[0]["status"] == "pending"

        # Check project status transitioned from APPROVED -> ACTIVE
        assert mock_projects[str(approved_project_id)].status == ProjectStatusEnum.ACTIVE

        # 6. Security Guard Test: Client cannot assign pilots (403 Forbidden)
        client_forbidden_alloc = client.post(
            f"/sectors/{sec_a1_id}/allocations",
            headers={"Authorization": f"Bearer {client_token}"},
            json={
                "pilot_id": str(pilot_id),
                "drone_model": "DJI Matrice 300 RTK",
                "drone_serial_number": "M300-8849-AF"
            }
        )
        assert client_forbidden_alloc.status_code == 403

        # 7. Ops allocates Licensed Pilot and Drone to Sector SEC-A1
        alloc_res = client.post(
            f"/sectors/{sec_a1_id}/allocations",
            headers={"Authorization": f"Bearer {ops_token}"},
            json={
                "pilot_id": str(pilot_id),
                "drone_model": "DJI Matrice 300 RTK",
                "drone_serial_number": "M300-8849-AF"
            }
        )
        assert alloc_res.status_code == 201
        alloc_data = alloc_res.json()
        alloc_id = alloc_data["id"]
        assert alloc_data["status"] == "assigned"
        assert alloc_data["pilot_id"] == str(pilot_id)
        assert alloc_data["drone_model"] == "DJI Matrice 300 RTK"

        # 8. Pilot views assigned missions
        my_missions_res = client.get(
            "/pilots/me/allocations",
            headers={"Authorization": f"Bearer {pilot_token}"}
        )
        assert my_missions_res.status_code == 200
        missions = my_missions_res.json()
        assert len(missions) == 1
        assert missions[0]["id"] == alloc_id

        # 9. Pilot updates status to IN_FLIGHT -> sector status updates to IN_PROGRESS
        flight_update = client.patch(
            f"/allocations/{alloc_id}/status",
            headers={"Authorization": f"Bearer {pilot_token}"},
            json={"status": "in_flight"}
        )
        assert flight_update.status_code == 200
        assert flight_update.json()["status"] == "in_flight"
        assert mock_sectors[str(sec_a1_id)].status == SectorStatusEnum.IN_PROGRESS

        # 10. Pilot finishes mission -> status to COMPLETED -> sector status updates to SURVEYED
        complete_update = client.patch(
            f"/allocations/{alloc_id}/status",
            headers={"Authorization": f"Bearer {pilot_token}"},
            json={"status": "completed"}
        )
        assert complete_update.status_code == 200
        assert complete_update.json()["status"] == "completed"
        assert mock_sectors[str(sec_a1_id)].status == SectorStatusEnum.SURVEYED

        # 11. Verify Timeline Events
        project_timeline_events = [e for e in mock_timeline if str(e.project_id) == str(approved_project_id)]
        actions = [e.action for e in project_timeline_events]
        assert "sectors_created" in actions
        assert "pilot_allocated" in actions
        assert "flight_status_updated" in actions
