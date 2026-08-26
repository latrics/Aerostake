import pytest
import uuid
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.modules.users.model import RoleEnum, User
from app.security.auth import hash_password
from app.security.jwt import create_access_token, create_refresh_token

client = TestClient(app)

# In-memory mock database store for testing isolated unit logic
mock_db_users = {}


class MockUserRepository:
    async def get_by_id(self, db, user_id):
        return mock_db_users.get(str(user_id))

    async def get_by_email(self, db, email):
        for u in mock_db_users.values():
            if u.email == email.lower().strip():
                return u
        return None

    async def create(self, db, email, hashed_password, role=RoleEnum.CLIENT):
        new_id = uuid.uuid4()
        user = User(
            id=new_id,
            email=email.lower().strip(),
            hashed_password=hashed_password,
            role=role,
            is_active=True,
        )
        mock_db_users[str(new_id)] = user
        return user


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_auth_and_rbac_flow():
    mock_repo = MockUserRepository()
    with patch("app.modules.users.service.user_repository", mock_repo), \
         patch("app.modules.users.repository.user_repository", mock_repo), \
         patch("app.security.auth.user_repository", mock_repo):

        # 1. Signup Client User
        client_signup_res = client.post(
            "/auth/signup",
            json={
                "email": "testclient@latrics.com",
                "password": "Password123!",
                "role": "client"
            }
        )
        assert client_signup_res.status_code == 201
        client_data = client_signup_res.json()
        assert "access_token" in client_data
        assert "refresh_token" in client_data
        assert client_data["user"]["email"] == "testclient@latrics.com"
        assert client_data["user"]["role"] == "client"
        client_token = client_data["access_token"]
        client_refresh = client_data["refresh_token"]

        # 2. Duplicate Signup rejection
        dup_res = client.post(
            "/auth/signup",
            json={
                "email": "testclient@latrics.com",
                "password": "Password123!",
                "role": "client"
            }
        )
        assert dup_res.status_code == 400

        # 3. Signup Admin User
        admin_signup_res = client.post(
            "/auth/signup",
            json={
                "email": "admin@latrics.com",
                "password": "AdminPassword123!",
                "role": "admin"
            }
        )
        assert admin_signup_res.status_code == 201
        admin_data = admin_signup_res.json()
        admin_token = admin_data["access_token"]
        assert admin_data["user"]["role"] == "admin"

        # 4. Signup Pilot User
        pilot_signup_res = client.post(
            "/auth/signup",
            json={
                "email": "pilot@latrics.com",
                "password": "PilotPassword123!",
                "role": "pilot"
            }
        )
        assert pilot_signup_res.status_code == 201
        pilot_token = pilot_signup_res.json()["access_token"]

        # 5. Login Success
        login_res = client.post(
            "/auth/login",
            json={
                "email": "testclient@latrics.com",
                "password": "Password123!"
            }
        )
        assert login_res.status_code == 200
        assert "access_token" in login_res.json()

        # 6. Login Failure (Wrong password)
        bad_login = client.post(
            "/auth/login",
            json={
                "email": "testclient@latrics.com",
                "password": "WrongPassword!"
            }
        )
        assert bad_login.status_code == 401

        # 7. GET /users/me without token -> 401
        unauth_me = client.get("/users/me")
        assert unauth_me.status_code == 401

        # 8. GET /users/me with Client Token -> 200
        auth_me = client.get(
            "/users/me",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert auth_me.status_code == 200
        assert auth_me.json()["email"] == "testclient@latrics.com"
        assert auth_me.json()["role"] == "client"

        # 9. RBAC Test: Admin accesses Admin-only endpoint -> 200
        admin_rbac = client.get(
            "/auth/rbac-test",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_rbac.status_code == 200
        assert admin_rbac.json()["status"] == "authorized"

        # 10. RBAC Test: Client tries Admin endpoint -> 403 Forbidden
        client_rbac = client.get(
            "/auth/rbac-test",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert client_rbac.status_code == 403

        # 11. RBAC Test: Pilot tries Admin endpoint -> 403 Forbidden
        pilot_rbac = client.get(
            "/auth/rbac-test",
            headers={"Authorization": f"Bearer {pilot_token}"}
        )
        assert pilot_rbac.status_code == 403

        # 12. Refresh Token Flow -> 200
        refresh_res = client.post(
            "/auth/refresh",
            json={"refresh_token": client_refresh}
        )
        assert refresh_res.status_code == 200
        assert "access_token" in refresh_res.json()


if __name__ == "__main__":
    test_health_check()
    test_auth_and_rbac_flow()
    print("ALL 12 AUTH & RBAC VERIFICATION TESTS PASSED SUCCESSFULLY!")
