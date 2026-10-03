import pytest
import uuid
from datetime import datetime, timezone
from unittest.mock import patch
from fastapi.testclient import TestClient

from app.main import app
from app.modules.planning.model import OperationalPlan, PlanStatusEnum, PlanningFormVersion, PlanningDraft
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
mock_planning_versions = {}
mock_planning_drafts = {}
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

    async def get_latest_version_number(self, db, project_id):
        vers = [v.version_number for v in mock_planning_versions.values() if v.project_id == project_id]
        return max(vers) if vers else 0

    async def get_latest_ops_version_number(self, db, project_id):
        ops_vers = [v.version_number for v in mock_planning_versions.values() if v.project_id == project_id and getattr(v, "sender", None) == "ops"]
        return max(ops_vers) if ops_vers else 0

    async def create_form_version(
        self, db, project_id, version_number, version_code, sender, sender_name=None,
        form_data=None, stage_threads=None, clarification_threads=None, attachments=None,
        status="under_review", created_by=None,
    ):
        v_id = uuid.uuid4()
        ver = PlanningFormVersion(
            id=v_id,
            project_id=project_id,
            version_number=version_number,
            version_code=version_code,
            sender=sender,
            sender_name=sender_name,
            form_data=form_data or {},
            stage_threads=stage_threads or {},
            clarification_threads=clarification_threads or [],
            attachments=attachments or [],
            status=status,
            created_by=created_by,
            created_at=datetime.now(timezone.utc),
        )
        mock_planning_versions[str(v_id)] = ver
        return ver

    async def list_form_versions_by_project(self, db, project_id):
        vers = [v for v in mock_planning_versions.values() if v.project_id == project_id]
        vers.sort(key=lambda x: x.version_number, reverse=True)
        return vers

    async def get_latest_form_version(self, db, project_id):
        vers = [v for v in mock_planning_versions.values() if v.project_id == project_id and getattr(v, "status", None) != "draft"]
        if not vers:
            return None
        vers.sort(key=lambda x: x.version_number, reverse=True)
        return vers[0]

    async def get_draft_by_project(self, db, project_id):
        return mock_planning_drafts.get(str(project_id))

    async def save_or_update_draft(
        self, db, project_id, form_data=None, stage_threads=None,
        clarification_threads=None, stage_draft_saved=None, status=None, updated_by=None
    ):
        draft = mock_planning_drafts.get(str(project_id))
        if not draft:
            draft = PlanningDraft(
                id=uuid.uuid4(),
                project_id=project_id,
                form_data=form_data or {},
                stage_threads=stage_threads or {},
                clarification_threads=clarification_threads or [],
                stage_draft_saved=stage_draft_saved or {},
                status=status or "under_review",
                updated_by=updated_by,
                updated_at=datetime.now(timezone.utc),
            )
            mock_planning_drafts[str(project_id)] = draft
        else:
            if form_data is not None:
                draft.form_data = form_data
            if stage_threads is not None:
                draft.stage_threads = stage_threads
            if clarification_threads is not None:
                draft.clarification_threads = clarification_threads
            if stage_draft_saved is not None:
                draft.stage_draft_saved = stage_draft_saved
            if status is not None:
                draft.status = status
            draft.updated_by = updated_by
            draft.updated_at = datetime.now(timezone.utc)
        return draft



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


def test_planning_form_versioning_and_request_filtering():
    client_id = uuid.uuid4()
    client_user = User(id=client_id, email="client2@latrics.com", role=RoleEnum.CLIENT, full_name="Acme Client", is_active=True)
    mock_users[str(client_id)] = client_user

    ops_id = uuid.uuid4()
    ops_user = User(id=ops_id, email="ops2@latrics.com", role=RoleEnum.OPERATIONS, full_name="Latrics Ops Analyst", is_active=True)
    mock_users[str(ops_id)] = ops_user

    client_token = create_access_token({"sub": str(client_id), "email": client_user.email, "role": "client"})
    ops_token = create_access_token({"sub": str(ops_id), "email": ops_user.email, "role": "operations"})

    project_id = uuid.uuid4()
    project = Project(
        id=project_id,
        title="Solar Farm Survey",
        client_id=client_id,
        status=ProjectStatusEnum.SUBMITTED,
    )
    mock_projects[str(project_id)] = project

    req_id = uuid.uuid4()
    request_ver = RequestVersion(
        id=req_id,
        project_id=project_id,
        version=1,
        survey_location="Rajasthan",
        survey_type="Topography",
    )
    mock_requests[str(req_id)] = request_ver

    with patch("app.security.auth.user_repository", MockUserRepo()), \
         patch("app.modules.planning.service.user_repository", MockUserRepo()), \
         patch("app.modules.projects.service.project_repository", MockProjectRepo()), \
         patch("app.modules.planning.service.project_repository", MockProjectRepo()), \
         patch("app.modules.planning.service.planning_repository", MockPlanningRepo()), \
         patch("app.modules.requests.service.planning_repository", MockPlanningRepo()), \
         patch("app.modules.requests.service.request_repository.list_all", return_value=[request_ver]), \
         patch("app.modules.requests.service.user_repository", MockUserRepo()), \
         patch("app.modules.requests.service.project_repository", MockProjectRepo()), \
         patch("app.modules.planning.service.timeline_service.log_event", MockTimelineService().log_event):

        # 1. Ops creates V01 (Initial Planning Form Snapshot)
        v01_res = client.post(
            f"/projects/{project_id}/planning-versions",
            headers={"Authorization": f"Bearer {ops_token}"},
            json={
                "sender": "ops",
                "form_data": {"numberOfLandings": "4", "plannedAltitudeMeters": "120"},
                "status": "under_review",
            }
        )
        assert v01_res.status_code == 201
        v01_data = v01_res.json()
        assert v01_data["version_number"] == 1
        assert v01_data["version_code"] == "Solar Farm Survey_V01"
        assert v01_data["sender"] == "ops"
        assert mock_projects[str(project_id)].status == ProjectStatusEnum.PLANNING

        # 2. Client submits clarification (belongs to current Ops version V01)
        v02_res = client.post(
            f"/projects/{project_id}/planning-versions",
            headers={"Authorization": f"Bearer {client_token}"},
            json={
                "sender": "client",
                "form_data": {"numberOfLandings": "4", "plannedAltitudeMeters": "120"},
                "clarification_threads": [{"id": "power", "answer": "Grid power available on site"}],
                "status": "under_review",
            }
        )
        assert v02_res.status_code == 201
        v02_data = v02_res.json()
        assert v02_data["version_number"] == 1
        assert v02_data["version_code"] == "Solar Farm Survey_V01"
        assert v02_data["sender"] == "client"

        # 3. Ops submits revised planning form V02
        v03_res = client.post(
            f"/projects/{project_id}/planning-versions",
            headers={"Authorization": f"Bearer {ops_token}"},
            json={
                "sender": "ops",
                "form_data": {"numberOfLandings": "4", "plannedAltitudeMeters": "120", "powerSource": "Grid"},
                "status": "under_review",
            }
        )
        assert v03_res.status_code == 201
        v03_data = v03_res.json()
        assert v03_data["version_number"] == 2
        assert v03_data["version_code"] == "Solar Farm Survey_V02"
        assert v03_data["sender"] == "ops"

        # 4. List versions
        list_res = client.get(
            f"/projects/{project_id}/planning-versions",
            headers={"Authorization": f"Bearer {ops_token}"}
        )
        assert list_res.status_code == 200
        vers = list_res.json()
        assert len(vers) == 3

        # 5. Check Requests listing enriches latest version
        reqs_res = client.get(
            "/requests",
            headers={"Authorization": f"Bearer {ops_token}"}
        )
        assert reqs_res.status_code == 200
        req_list = reqs_res.json()
        assert len(req_list) == 1
        assert req_list[0]["latest_planning_version"] == "Solar Farm Survey_V02"
        assert req_list[0]["planning_versions_count"] == 2
        assert req_list[0]["planning_updated_by"] == "ops"

