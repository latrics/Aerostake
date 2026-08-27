import pytest
import uuid
from unittest.mock import patch
from fastapi.testclient import TestClient

from app.main import app
from app.modules.projects.model import Project, ProjectStatusEnum
from app.modules.requests.model import RequestVersion
from app.modules.timeline.model import TimelineEvent
from app.modules.users.model import RoleEnum, User
from app.security.jwt import create_access_token

client = TestClient(app)

# In-memory mock store
mock_users = {}
mock_projects = {}
mock_requests = []
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
    async def create(self, db, title, description, client_id):
        p_id = uuid.uuid4()
        p = Project(
            id=p_id,
            title=title,
            description=description,
            client_id=client_id,
            status=ProjectStatusEnum.DRAFT,
        )
        mock_projects[str(p_id)] = p
        return p

    async def get_by_id(self, db, project_id):
        return mock_projects.get(str(project_id))

    async def list_by_client(self, db, client_id, skip=0, limit=100):
        return [p for p in mock_projects.values() if p.client_id == client_id]

    async def list_all(self, db, skip=0, limit=100, status=None):
        res = list(mock_projects.values())
        if status:
            res = [p for p in res if p.status == status]
        return res

    async def update(self, db, project, title=None, description=None, status=None):
        if title is not None:
            project.title = title
        if description is not None:
            project.description = description
        if status is not None:
            project.status = status
        mock_projects[str(project.id)] = project
        return project


class MockRequestRepo:
    async def get_latest_version_number(self, db, project_id):
        versions = [r.version for r in mock_requests if r.project_id == project_id]
        return max(versions) if versions else 0

    async def create_version(
        self, db, project_id, version, survey_location, survey_type, target_area_sqkm, requirements_payload, created_by
    ):
        req = RequestVersion(
            id=uuid.uuid4(),
            project_id=project_id,
            version=version,
            survey_location=survey_location,
            survey_type=survey_type,
            target_area_sqkm=target_area_sqkm,
            requirements_payload=requirements_payload or {},
            created_by=created_by,
        )
        mock_requests.append(req)
        return req

    async def list_by_project(self, db, project_id):
        return [r for r in mock_requests if r.project_id == project_id]

    async def get_by_version(self, db, project_id, version):
        for r in mock_requests:
            if r.project_id == project_id and r.version == version:
                return r
        return None


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

    async def list_by_project(self, db, project_id, limit=100):
        return [e for e in mock_timeline if e.project_id == project_id]


def test_projects_and_requests_full_lifecycle():
    # Setup test users
    client_a_id = uuid.uuid4()
    client_a = User(id=client_a_id, email="client_a@latrics.com", role=RoleEnum.CLIENT, is_active=True)
    mock_users[str(client_a_id)] = client_a

    client_b_id = uuid.uuid4()
    client_b = User(id=client_b_id, email="client_b@latrics.com", role=RoleEnum.CLIENT, is_active=True)
    mock_users[str(client_b_id)] = client_b

    token_a = create_access_token({"sub": str(client_a_id), "email": client_a.email, "role": "client"})
    token_b = create_access_token({"sub": str(client_b_id), "email": client_b.email, "role": "client"})

    with patch("app.security.auth.user_repository", MockUserRepo()), \
         patch("app.modules.projects.service.project_repository", MockProjectRepo()), \
         patch("app.modules.projects.service.timeline_service.log_event", MockTimelineService().log_event), \
         patch("app.modules.requests.service.project_repository", MockProjectRepo()), \
         patch("app.modules.requests.service.request_repository", MockRequestRepo()), \
         patch("app.modules.requests.service.timeline_service.log_event", MockTimelineService().log_event):

        # 1. Client A creates Project
        create_res = client.post(
            "/projects",
            headers={"Authorization": f"Bearer {token_a}"},
            json={
                "title": "Solar Farm Thermal Inspection",
                "description": "Thermographic anomaly survey for 50MW plant"
            }
        )
        assert create_res.status_code == 201
        project_data = create_res.json()
        project_id = project_data["id"]
        assert project_data["title"] == "Solar Farm Thermal Inspection"
        assert project_data["status"] == "draft"
        assert project_data["client_id"] == str(client_a_id)

        # 2. Client A submits Request #001
        req1_res = client.post(
            f"/projects/{project_id}/requests",
            headers={"Authorization": f"Bearer {token_a}"},
            json={
                "survey_location": "Bhadla Solar Park, Rajasthan",
                "survey_type": "thermal",
                "target_area_sqkm": 2.5,
                "requirements_payload": {"gaps": "5cm/px", "sensors": ["FLIR Duo Pro R"]}
            }
        )
        assert req1_res.status_code == 201
        req1_data = req1_res.json()
        assert req1_data["version"] == 1
        assert req1_data["survey_type"] == "thermal"
        assert req1_data["project_id"] == project_id

        # Check project status is now SUBMITTED
        p_check = client.get(f"/projects/{project_id}", headers={"Authorization": f"Bearer {token_a}"})
        assert p_check.status_code == 200
        assert p_check.json()["status"] == "submitted"

        # 3. Client A submits Request #002 (Revision)
        req2_res = client.post(
            f"/projects/{project_id}/requests",
            headers={"Authorization": f"Bearer {token_a}"},
            json={
                "survey_location": "Bhadla Solar Park, Rajasthan - Expanded Block C",
                "survey_type": "thermal_and_rgb",
                "target_area_sqkm": 3.8,
                "requirements_payload": {"gaps": "3cm/px", "sensors": ["FLIR Duo Pro R", "Sony A7R IV"]}
            }
        )
        assert req2_res.status_code == 201
        req2_data = req2_res.json()
        assert req2_data["version"] == 2
        assert req2_data["survey_type"] == "thermal_and_rgb"

        # 4. List all versions -> both #001 and #002 exist immutably
        list_reqs = client.get(
            f"/projects/{project_id}/requests",
            headers={"Authorization": f"Bearer {token_a}"}
        )
        assert list_reqs.status_code == 200
        versions_list = list_reqs.json()
        assert len(versions_list) == 2
        assert versions_list[0]["version"] == 1
        assert versions_list[1]["version"] == 2

        # 5. Fetch specific version #001
        v1_fetch = client.get(
            f"/projects/{project_id}/requests/1",
            headers={"Authorization": f"Bearer {token_a}"}
        )
        assert v1_fetch.status_code == 200
        assert v1_fetch.json()["version"] == 1
        assert v1_fetch.json()["survey_type"] == "thermal"

        # 6. Verify Timeline events were created
        project_timeline_events = [e for e in mock_timeline if str(e.project_id) == project_id]
        # Should have: 1 project_created event + 2 request_submitted events = 3 events
        assert len(project_timeline_events) == 3

        # 7. Security / Access Control: Client B cannot view Client A's project
        unauthorized_view = client.get(
            f"/projects/{project_id}",
            headers={"Authorization": f"Bearer {token_b}"}
        )
        assert unauthorized_view.status_code == 403

        # 8. Security: Client B cannot submit request on Client A's project
        unauthorized_req = client.post(
            f"/projects/{project_id}/requests",
            headers={"Authorization": f"Bearer {token_b}"},
            json={
                "survey_location": "Unauthorized Location",
                "survey_type": "inspection"
            }
        )
        assert unauthorized_req.status_code == 403
