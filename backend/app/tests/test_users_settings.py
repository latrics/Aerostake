import pytest
import uuid
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.modules.users.model import RoleEnum, User
from app.security.auth import hash_password, verify_password
from app.security.jwt import create_access_token

client = TestClient(app)

mock_settings_users = {}


class MockSettingsUserRepo:
    async def get_by_id(self, db, user_id):
        return mock_settings_users.get(str(user_id))

    async def get_by_email(self, db, email):
        for u in mock_settings_users.values():
            if u.email.lower() == email.lower().strip():
                return u
        return None

    async def update_profile(
        self,
        db,
        user,
        full_name=None,
        email=None,
        company_name=None,
        phone_number=None,
        designation=None,
        company_profile=None,
    ):
        if full_name is not None:
            user.full_name = full_name
        if email is not None:
            user.email = email.lower().strip()
        if company_name is not None:
            user.company_name = company_name
        if phone_number is not None:
            user.phone_number = phone_number
        if company_profile is not None:
            user.company_profile = company_profile
        if designation is not None:
            cp = dict(user.company_profile or {})
            cp["designation"] = designation
            user.company_profile = cp
        return user

    async def delete(self, db, user, soft=False):
        if soft:
            user.is_active = False
        else:
            mock_settings_users.pop(str(user.id), None)

    async def toggle_active(self, db, user, is_active):
        user.is_active = is_active
        return user

    async def leave_organization(self, db, user):
        user.organization_id = None
        user.company_name = None
        user.invited_by = None
        if user.role in [RoleEnum.CLIENT_PRIMARY, RoleEnum.CLIENT_SUB]:
            user.role = RoleEnum.CLIENT
        if user.company_profile:
            cp = dict(user.company_profile)
            cp.pop("team_members", None)
            cp.pop("company_name", None)
            cp["is_onboarded"] = False
            user.company_profile = cp
        return user



async def override_get_db():
    mock_session = AsyncMock()
    mock_session.add = lambda obj: None
    mock_session.flush = AsyncMock()
    mock_session.refresh = AsyncMock()
    mock_session.commit = AsyncMock()
    mock_session.rollback = AsyncMock()
    yield mock_session


def test_user_personal_settings_and_password_change():
    u_id = uuid.uuid4()
    original_user = User(
        id=u_id,
        email="client.john@acme.com",
        hashed_password=hash_password("OldPassword123!"),
        role=RoleEnum.CLIENT_PRIMARY,
        full_name="John Doe",
        phone_number="+91 98765 43210",
        company_profile={"designation": "Project Manager"},
        is_active=True,
    )
    mock_settings_users[str(u_id)] = original_user

    u2_id = uuid.uuid4()
    other_user = User(
        id=u2_id,
        email="other.client@other.com",
        hashed_password=hash_password("OtherPassword123!"),
        role=RoleEnum.CLIENT_PRIMARY,
        is_active=True,
    )
    mock_settings_users[str(u2_id)] = other_user

    token = create_access_token({"sub": str(u_id), "email": original_user.email, "role": "client_primary"})

    app.dependency_overrides[get_db] = override_get_db
    repo = MockSettingsUserRepo()

    try:
        with patch("app.security.auth.user_repository", repo), \
             patch("app.modules.users.service.user_repository", repo), \
             patch("app.modules.users.repository.user_repository", repo):

            # 1. Update personal details (full_name, email, phone, designation)
            patch_res = client.patch(
                "/users/me",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "full_name": "Johnathon Doe",
                    "email": "john.updated@acme.com",
                    "phone_number": "+91 99999 88888",
                    "designation": "Director of Surveying",
                },
            )
            assert patch_res.status_code == 200, f"Error: {patch_res.text}"
            data = patch_res.json()
            assert data["full_name"] == "Johnathon Doe"
            assert data["email"] == "john.updated@acme.com"
            assert data["phone_number"] == "+91 99999 88888"
            assert data["designation"] == "Director of Surveying"

            # 2. Reject duplicate email change
            dup_res = client.patch(
                "/users/me",
                headers={"Authorization": f"Bearer {token}"},
                json={"email": "other.client@other.com"},
            )
            assert dup_res.status_code == 400
            assert "already exists" in str(dup_res.json())

            # 3. Change password with incorrect current password -> 400
            bad_pw_res = client.post(
                "/users/me/change-password",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "current_password": "WrongCurrentPassword!",
                    "new_password": "NewSecretPassword123!",
                },
            )
            assert bad_pw_res.status_code == 400
            assert "Incorrect current password" in str(bad_pw_res.json())

            # 4. Change password with too short password -> 422 Unprocessable Entity (Pydantic min_length=6)
            short_pw_res = client.post(
                "/users/me/change-password",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "current_password": "OldPassword123!",
                    "new_password": "123",
                },
            )
            assert short_pw_res.status_code == 422

            # 5. Successfully change password
            success_pw_res = client.post(
                "/users/me/change-password",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "current_password": "OldPassword123!",
                    "new_password": "BrandNewPassword123!",
                },
            )
            assert success_pw_res.status_code == 200
            assert success_pw_res.json()["status"] == "success"

            # Verify password was indeed hashed and updated on user
            assert verify_password("BrandNewPassword123!", original_user.hashed_password)
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_user_deletion_and_client_leave_organization():
    admin_id = uuid.uuid4()
    admin_user = User(
        id=admin_id,
        email="admin@latrics.com",
        hashed_password=hash_password("AdminPass123!"),
        role=RoleEnum.ADMIN,
        full_name="Latrics Admin",
        is_active=True,
    )
    mock_settings_users[str(admin_id)] = admin_user

    client_id = uuid.uuid4()
    org_id = uuid.uuid4()
    sub_client_user = User(
        id=client_id,
        email="subclient@acme.com",
        hashed_password=hash_password("SubClient123!"),
        role=RoleEnum.CLIENT_SUB,
        organization_id=org_id,
        company_name="Acme Corp",
        full_name="Alice Member",
        company_profile={"company_name": "Acme Corp", "is_onboarded": True},
        is_active=True,
    )
    mock_settings_users[str(client_id)] = sub_client_user

    admin_token = create_access_token({"sub": str(admin_id), "email": admin_user.email, "role": "admin"})
    client_token = create_access_token({"sub": str(client_id), "email": sub_client_user.email, "role": "client_sub"})

    app.dependency_overrides[get_db] = override_get_db
    repo = MockSettingsUserRepo()

    try:
        with patch("app.security.auth.user_repository", repo), \
             patch("app.modules.users.service.user_repository", repo), \
             patch("app.modules.users.repository.user_repository", repo):

            # 1. Client leaves organization
            leave_res = client.post(
                "/users/me/leave-organization",
                headers={"Authorization": f"Bearer {client_token}"},
            )
            assert leave_res.status_code == 200, f"Error: {leave_res.text}"
            leave_data = leave_res.json()
            assert leave_data["organization_id"] is None
            assert leave_data["company_name"] is None
            assert leave_data["role"] == "client"

            # 2. Admin cannot delete own account -> 400
            self_del_res = client.delete(
                f"/users/{admin_id}",
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            assert self_del_res.status_code == 400
            assert "Cannot delete your own active administrator account" in str(self_del_res.json())

            # 3. Admin toggles user status (deactivate user)
            deactivate_res = client.patch(
                f"/users/{client_id}/status",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"is_active": False},
            )
            assert deactivate_res.status_code == 200
            assert deactivate_res.json()["is_active"] is False

            # 4. Admin deletes user
            del_res = client.delete(
                f"/users/{client_id}",
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            assert del_res.status_code == 200
            assert del_res.json()["status"] == "success"
            assert str(client_id) not in mock_settings_users

            # 5. Client self-deletes own account
            other_client_id = uuid.uuid4()
            other_client = User(
                id=other_client_id,
                email="leave.me@test.com",
                hashed_password=hash_password("Pass123!"),
                role=RoleEnum.CLIENT,
                is_active=True,
            )
            mock_settings_users[str(other_client_id)] = other_client
            other_token = create_access_token({"sub": str(other_client_id), "email": other_client.email, "role": "client"})

            self_delete_res = client.delete(
                "/users/me",
                headers={"Authorization": f"Bearer {other_token}"},
            )
            assert self_delete_res.status_code == 200
            assert self_delete_res.json()["status"] == "success"
            assert other_client.is_active is False
    finally:
        app.dependency_overrides.pop(get_db, None)

