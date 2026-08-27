import pytest
import uuid
from unittest.mock import patch
from fastapi.testclient import TestClient

from app.main import app
from app.modules.projects.model import Project, ProjectStatusEnum
from app.modules.timeline.model import TimelineEvent
from app.modules.users.model import RoleEnum, User
from app.security.jwt import create_access_token
from app.seed import seed_database
from app.shared.rate_limiter import RateLimiter

client = TestClient(app)

mock_users = {}
mock_projects = {}
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


class MockTimelineRepo:
    async def list_by_project(self, db, project_id, category=None, limit=100):
        events = [e for e in mock_timeline if str(e.project_id) == str(project_id)]
        if category:
            events = [e for e in events if e.category == category]
        return events[:limit]


def test_global_exception_handler_json_shape():
    # 1. Test 404 Error Format
    res_404 = client.get("/projects/00000000-0000-0000-0000-000000000000")
    assert res_404.status_code in [401, 404]
    data = res_404.json()
    assert "status" in data
    assert data["status"] == "error"
    assert "message" in data
    assert "details" in data

    # 2. Test 422 Schema Validation Error Format
    res_422 = client.post("/auth/login", json={"email": "not-an-email"})
    assert res_422.status_code == 422
    data_422 = res_422.json()
    assert data_422["status"] == "error"
    assert data_422["message"] == "Request validation failed"
    assert len(data_422["details"]) > 0


def test_public_timeline_category_filtering():
    client_id = uuid.uuid4()
    client_user = User(id=client_id, email="client@latrics.com", role=RoleEnum.CLIENT, is_active=True)
    mock_users[str(client_id)] = client_user
    client_token = create_access_token({"sub": str(client_id), "email": client_user.email, "role": "client"})

    project_id = uuid.uuid4()
    project = Project(
        id=project_id,
        title="Solar Park Survey",
        client_id=client_id,
        status=ProjectStatusEnum.ACTIVE,
    )
    mock_projects[str(project_id)] = project

    # Add mock timeline events
    ev1 = TimelineEvent(
        id=uuid.uuid4(),
        project_id=project_id,
        user_id=client_id,
        category="request",
        action="request_submitted",
        message="Request #001 submitted",
    )
    ev2 = TimelineEvent(
        id=uuid.uuid4(),
        project_id=project_id,
        user_id=client_id,
        category="payment",
        action="payment_verified",
        message="Payment of $3,600.00 verified",
    )
    mock_timeline.clear()
    mock_timeline.extend([ev1, ev2])

    with patch("app.security.auth.user_repository", MockUserRepo()), \
         patch("app.modules.projects.service.project_repository", MockProjectRepo()), \
         patch("app.modules.timeline.service.timeline_repository", MockTimelineRepo()):

        # 1. Fetch All Timeline Events
        all_res = client.get(
            f"/timeline/{project_id}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert all_res.status_code == 200
        assert len(all_res.json()) == 2

        # 2. Filter by Category 'payment'
        filtered_res = client.get(
            f"/timeline/{project_id}?category=payment",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert filtered_res.status_code == 200
        filtered_events = filtered_res.json()
        assert len(filtered_events) == 1
        assert filtered_events[0]["category"] == "payment"
        assert filtered_events[0]["action"] == "payment_verified"


@pytest.mark.asyncio
async def test_rate_limiter_sliding_window_fallback():
    limiter = RateLimiter(times=5, seconds=10)
    # When Redis is not running in test env, limiter should gracefully fall back to allowed
    class DummyRequest:
        client = None
        url = type("URL", (), {"path": "/auth/login"})()

    allowed = await limiter(DummyRequest())
    assert allowed is True
