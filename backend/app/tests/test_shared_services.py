import pytest
import uuid
from unittest.mock import AsyncMock, patch, MagicMock

from app.modules.notifications.service import notification_service
from app.modules.timeline.model import TimelineEvent
from app.modules.timeline.service import timeline_service
from app.shared.redis_client import get_redis_client, ping_redis, close_redis


@pytest.mark.asyncio
async def test_redis_client_helpers():
    # Test Redis client singleton retrieval
    client = get_redis_client()
    assert client is not None

    # Test ping with mocked redis
    with patch.object(client, "ping", new_callable=AsyncMock) as mock_ping:
        mock_ping.return_value = True
        is_alive = await ping_redis()
        assert is_alive is True

    # Test graceful close
    await close_redis()


@pytest.mark.asyncio
async def test_notification_service_sandbox():
    # Test email dispatch in sandbox environment
    email_success = await notification_service.send_email(
        to_email="pilot@latrics.com",
        subject="Survey Mission Scheduled",
        html_content="<p>Your survey mission has been scheduled for tomorrow.</p>",
    )
    assert email_success is True

    # Test push notification in sandbox environment
    push_success = await notification_service.send_push(
        device_token="dummy_fcm_device_token_xyz_123",
        title="Flight Plan Approved",
        body="Client approved Flight Plan #002.",
        data={"project_id": str(uuid.uuid4()), "action": "approved"},
    )
    assert push_success is True


@pytest.mark.asyncio
async def test_timeline_logging_service():
    mock_db = AsyncMock()
    mock_events = []

    class MockTimelineRepository:
        async def create_event(
            self, db, category, action, message, project_id=None, user_id=None, event_metadata=None
        ):
            event = TimelineEvent(
                id=uuid.uuid4(),
                project_id=project_id,
                user_id=user_id,
                category=category,
                action=action,
                message=message,
                event_metadata=event_metadata or {},
            )
            mock_events.append(event)
            return event

        async def list_by_project(self, db, project_id, category=None, limit=100):
            events = [e for e in mock_events if e.project_id == project_id]
            if category:
                events = [e for e in events if e.category == category]
            return events[:limit]

    test_project_id = uuid.uuid4()
    test_user_id = uuid.uuid4()

    with patch("app.modules.timeline.service.timeline_repository", MockTimelineRepository()):
        # 1. Log event
        logged_event = await timeline_service.log_event(
            db=mock_db,
            category="request",
            action="request_submitted",
            message="Client submitted initial survey request #001",
            project_id=test_project_id,
            user_id=test_user_id,
            metadata={"version": 1, "sector_count": 4},
        )

        assert logged_event is not None
        assert logged_event.category == "request"
        assert logged_event.action == "request_submitted"
        assert logged_event.project_id == test_project_id
        assert logged_event.user_id == test_user_id
        assert logged_event.event_metadata["version"] == 1

        # 2. Fetch project timeline
        timeline_list = await timeline_service.get_project_timeline(
            db=mock_db,
            project_id=test_project_id,
        )
        assert len(timeline_list) == 1
        assert timeline_list[0].action == "request_submitted"
