import pytest
import uuid
from unittest.mock import patch
from fastapi.testclient import TestClient

from app.main import app
from app.modules.planning.model import OperationalPlan, PlanStatusEnum
from app.modules.projects.model import Project, ProjectStatusEnum
from app.modules.requests.model import RequestVersion
from app.modules.timeline.model import TimelineEvent
from app.modules.users.model import RoleEnum, User
from app.security.jwt import create_access_token

client = TestClient(app)

# In-memory mock store
mock_users = {}
mock_projects = {}
mock_requests = {}
mock_plans = {}
mock_timeline = []


class MockUserRepo:
    async def get_by_id(self, db, user_id):
        return mock_users.get(str(user_id))

    async def get_by_email(self, db, email):
        for u in mock_users.values():
            if u.email == email:
                return u
        return None

    async def get_users_by_roles(self, db, roles):
        return [u for u in mock_users.values() if u.role in roles]



class MockProjectRepo:
    async def get_by_id(self, db, project_id):
        return mock_projects.get(str(project_id))

    async def update(self, db, project, title=None, description=None, status=None):
        if title is not None:
            project.title = title
        if description is not None:
            project.description = description
        if status is not None:
            project.status = status
        mock_projects[str(project.id)] = project
        return project


class MockPlanningRepo:
    async def create_plan(
        self,
        db,
        project_id,
        request_version_id,
        estimated_flight_hours,
        required_pilots_count,
        required_drones_count,
        estimated_cost_usd,
        flight_strategy_notes=None,
    ):
        plan_id = uuid.uuid4()
        plan = OperationalPlan(
            id=plan_id,
            project_id=project_id,
            request_version_id=request_version_id,
            status=PlanStatusEnum.DRAFT,
            estimated_flight_hours=estimated_flight_hours,
            required_pilots_count=required_pilots_count,
            required_drones_count=required_drones_count,
            estimated_cost_usd=estimated_cost_usd,
            flight_strategy_notes=flight_strategy_notes,
        )
        mock_plans[str(plan_id)] = plan
        return plan

    async def get_by_id(self, db, plan_id):
        return mock_plans.get(str(plan_id))

    async def get_active_plan_for_project(self, db, project_id):
        for p in mock_plans.values():
            if p.project_id == project_id and p.status == PlanStatusEnum.PUBLISHED:
                return p
        return None

    async def list_by_project(self, db, project_id):
        return [p for p in mock_plans.values() if p.project_id == project_id]

    async def publish_plan(self, db, plan, published_by_user_id):
        plan.status = PlanStatusEnum.PUBLISHED
        plan.published_by = published_by_user_id
        mock_plans[str(plan.id)] = plan
        return plan

    async def update_status(self, db, plan, new_status):
        plan.status = new_status
        mock_plans[str(plan.id)] = plan
        return plan


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


def test_planning_and_approval_full_lifecycle():
    # 1. Setup Test Users: Client, Ops Manager, and Drone Pilot
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

    # 2. Setup Existing Project and Request Version #001
    project_id = uuid.uuid4()
    project = Project(
        id=project_id,
        title="Wind Turbine Blade Inspection",
        description="High-resolution visual and ultrasonic inspection",
        client_id=client_id,
        status=ProjectStatusEnum.SUBMITTED,
    )
    mock_projects[str(project_id)] = project

    req_id = uuid.uuid4()
    req_ver = RequestVersion(
        id=req_id,
        project_id=project_id,
        version=1,
        survey_location="Jaisalmer Wind Park",
        survey_type="inspection",
        target_area_sqkm=1.2,
        requirements_payload={"turbines_count": 25},
        created_by=client_id,
    )
    mock_requests[str(req_id)] = req_ver

    async def mock_async_get(self, entity, pk):
        return req_ver if str(pk) == str(req_id) else None

    async def mock_async_send_email(**kw):
        return True

    with patch("app.security.auth.user_repository", MockUserRepo()), \
         patch("app.modules.planning.service.project_repository", MockProjectRepo()), \
         patch("app.modules.planning.service.planning_repository", MockPlanningRepo()), \
         patch("app.modules.planning.service.user_repository", MockUserRepo()), \
         patch("app.modules.planning.service.timeline_service.log_event", MockTimelineService().log_event), \
         patch("app.modules.planning.service.notification_service.send_email", mock_async_send_email), \
         patch("app.modules.projects.service.project_repository", MockProjectRepo()), \
         patch("sqlalchemy.ext.asyncio.AsyncSession.get", mock_async_get):

        # 3. Security Guard Test: Client and Pilot cannot publish plans (403 Forbidden)
        forbidden_pub = client.post(
            f"/planning/requests/{req_id}",
            headers={"Authorization": f"Bearer {client_token}"},
            json={
                "estimated_flight_hours": 18.5,
                "required_pilots_count": 2,
                "required_drones_count": 2,
                "estimated_cost_usd": 6800.0,
            }
        )
        assert forbidden_pub.status_code == 403

        pilot_forbidden = client.post(
            f"/planning/requests/{req_id}",
            headers={"Authorization": f"Bearer {pilot_token}"},
            json={
                "estimated_flight_hours": 18.5,
                "required_pilots_count": 2,
                "required_drones_count": 2,
                "estimated_cost_usd": 6800.0,
            }
        )
        assert pilot_forbidden.status_code == 403

        # 4. Ops Manager publishes Operational Plan for Request #001
        publish_res = client.post(
            f"/planning/requests/{req_id}",
            headers={"Authorization": f"Bearer {ops_token}"},
            json={
                "estimated_flight_hours": 18.5,
                "required_pilots_count": 2,
                "required_drones_count": 2,
                "estimated_cost_usd": 6800.0,
                "flight_strategy_notes": "Dual team survey with DJI Matrice 300 RTK and Zenmuse H20T thermal payload."
            }
        )
        assert publish_res.status_code == 201
        plan_data = publish_res.json()
        assert plan_data["status"] == "published"
        assert plan_data["estimated_cost_usd"] == 6800.0
        assert plan_data["required_pilots_count"] == 2
        assert plan_data["required_drones_count"] == 2
        assert plan_data["project_id"] == str(project_id)
        assert plan_data["request_version_id"] == str(req_id)

        # Check project status is now PLANNING
        assert mock_projects[str(project_id)].status == ProjectStatusEnum.PLANNING

        # 5. Client views the active published plan
        plan_view_res = client.get(
            f"/projects/{project_id}/plan",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert plan_view_res.status_code == 200
        active_plan = plan_view_res.json()
        assert active_plan["estimated_cost_usd"] == 6800.0
        assert active_plan["required_pilots_count"] == 2

        # 6. Revision Flow: Client requests revision on the plan
        revise_res = client.post(
            f"/projects/{project_id}/revise",
            headers={"Authorization": f"Bearer {client_token}"},
            json={"feedback_notes": "Please optimize for single pilot team to reduce cost."}
        )
        assert revise_res.status_code == 200
        assert revise_res.json()["status"] == "submitted"

        # Check plan was marked SUPERSEDED
        assert mock_plans[plan_data["id"]].status == PlanStatusEnum.SUPERSEDED

        # 7. Ops publishes revised plan
        publish_revised = client.post(
            f"/planning/requests/{req_id}",
            headers={"Authorization": f"Bearer {ops_token}"},
            json={
                "estimated_flight_hours": 24.0,
                "required_pilots_count": 1,
                "required_drones_count": 1,
                "estimated_cost_usd": 4200.0,
                "flight_strategy_notes": "Single pilot phased inspection over 3 consecutive days."
            }
        )
        assert publish_revised.status_code == 201
        revised_plan_data = publish_revised.json()
        assert revised_plan_data["estimated_cost_usd"] == 4200.0
        assert revised_plan_data["required_pilots_count"] == 1

        # 8. Approval Flow: Client approves the revised operational plan
        approve_res = client.post(
            f"/projects/{project_id}/approve",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert approve_res.status_code == 200
        assert approve_res.json()["status"] == "approved"
        assert mock_projects[str(project_id)].status == ProjectStatusEnum.APPROVED

        # 9. Verify Timeline Events Logged
        project_events = [e for e in mock_timeline if str(e.project_id) == str(project_id)]
        actions = [e.action for e in project_events]
        assert "plan_published" in actions
        assert "plan_revision_requested" in actions
        assert "plan_approved" in actions
