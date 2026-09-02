import uuid
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.modules.users.model import RoleEnum, User
from app.security.auth import hash_password
from app.security.jwt import create_access_token

client = TestClient(app)


def test_device_token_registration_and_notification_wiring():
    user_id = uuid.uuid4()
    mock_user = User(
        id=user_id,
        email="pilot_test@latrics.com",
        hashed_password=hash_password("Password123!"),
        role=RoleEnum.PILOT,
        is_active=True,
        device_token=None,
    )

    token = create_access_token({"sub": str(user_id), "email": mock_user.email, "role": mock_user.role.value})
    auth_headers = {"Authorization": f"Bearer {token}"}

    async def mock_get_by_id(db, uid):
        if str(uid) == str(user_id):
            return mock_user
        return None

    async def mock_update_device_token(db, user, device_token):
        user.device_token = device_token
        return user

    with patch("app.security.auth.user_repository.get_by_id", side_effect=mock_get_by_id), \
         patch("app.modules.users.service.user_repository.update_device_token", side_effect=mock_update_device_token):

        # 1. Register device token
        res = client.post(
            "/users/me/device-token",
            json={"device_token": "fcm_test_device_token_xyz_123456789"},
            headers=auth_headers,
        )

        assert res.status_code == 200
        data = res.json()
        assert data["email"] == "pilot_test@latrics.com"
        assert data["device_token"] == "fcm_test_device_token_xyz_123456789"
        assert mock_user.device_token == "fcm_test_device_token_xyz_123456789"
