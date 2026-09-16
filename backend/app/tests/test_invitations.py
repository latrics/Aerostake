import pytest
import uuid
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.modules.invitations.model import Invitation, InvitationStatusEnum
from app.modules.organizations.model import Organization
from app.modules.users.model import RoleEnum, User
from app.security.jwt import create_access_token

client = TestClient(app)

mock_test_users = {}
mock_test_invites = {}
mock_test_orgs = {}


class MockInvitationRepo:
    async def get_by_id(self, db, invite_id):
        return mock_test_invites.get(str(invite_id))

    async def get_by_token(self, db, token):
        for i in mock_test_invites.values():
            if i.token == token:
                return i
        return None

    async def get_pending_by_email(self, db, email):
        for i in mock_test_invites.values():
            if i.email.lower() == email.lower().strip() and i.status == InvitationStatusEnum.PENDING:
                return i
        return None

    async def create(self, db, email, role, token, invited_by, expires_at, organization_id=None):
        from datetime import datetime, timezone
        inv_id = uuid.uuid4()
        now = datetime.now(timezone.utc)
        inv = Invitation(
            id=inv_id,
            email=email,
            role=role,
            token=token,
            invited_by=invited_by,
            expires_at=expires_at,
            organization_id=organization_id,
            status=InvitationStatusEnum.PENDING,
            created_at=now,
            updated_at=now,
        )
        mock_test_invites[str(inv_id)] = inv
        return inv

    async def mark_accepted(self, db, invitation):
        invitation.status = InvitationStatusEnum.ACCEPTED
        return invitation

    async def count_subordinate_users(self, db, organization_id):
        return sum(1 for u in mock_test_users.values() if u.organization_id == organization_id and u.role == RoleEnum.CLIENT_SUB)

    async def get_or_create_organization(self, db, name):
        for o in mock_test_orgs.values():
            if o.name.lower() == name.lower().strip():
                return o
        new_id = uuid.uuid4()
        org = Organization(id=new_id, name=name.strip())
        mock_test_orgs[str(new_id)] = org
        return org


class MockUserRepoInv:
    async def get_by_id(self, db, user_id):
        return mock_test_users.get(str(user_id))

    async def get_by_email(self, db, email):
        for u in mock_test_users.values():
            if u.email.lower() == email.lower().strip():
                return u
        return None

    async def create(self, db, email, hashed_password, role, organization_id=None, invited_by=None, full_name=None, company_name=None, phone_number=None):
        u_id = uuid.uuid4()
        user = User(
            id=u_id,
            email=email,
            hashed_password=hashed_password,
            role=role,
            organization_id=organization_id,
            invited_by=invited_by,
            full_name=full_name,
            company_name=company_name,
            phone_number=phone_number,
            is_active=True
        )
        mock_test_users[str(u_id)] = user
        return user

    async def update_profile(self, db, user, full_name=None, email=None, company_name=None, phone_number=None, designation=None, company_profile=None):
        if full_name:
            user.full_name = full_name
        if email:
            user.email = email
        if company_name:
            user.company_name = company_name
        if phone_number:
            user.phone_number = phone_number
        if company_profile:
            user.company_profile = company_profile
        return user


async def override_get_db():
    mock_session = AsyncMock()
    mock_session.add = lambda obj: None
    mock_session.flush = AsyncMock()
    mock_session.refresh = AsyncMock()
    mock_session.commit = AsyncMock()
    mock_session.rollback = AsyncMock()
    yield mock_session


def test_invitation_permissions_and_acceptance_flow():
    admin_id = uuid.uuid4()
    admin_user = User(id=admin_id, email="aditya.paul@latrics.com", role=RoleEnum.ADMIN, is_active=True)
    mock_test_users[str(admin_id)] = admin_user

    pilot_id = uuid.uuid4()
    pilot_user = User(id=pilot_id, email="pilot@latrics.com", role=RoleEnum.PILOT, is_active=True)
    mock_test_users[str(pilot_id)] = pilot_user

    admin_token = create_access_token({"sub": str(admin_id), "email": admin_user.email, "role": "admin"})
    pilot_token = create_access_token({"sub": str(pilot_id), "email": pilot_user.email, "role": "pilot"})

    inv_repo = MockInvitationRepo()
    user_repo = MockUserRepoInv()

    app.dependency_overrides[get_db] = override_get_db

    try:
        with patch("app.security.auth.user_repository", user_repo), \
             patch("app.modules.invitations.service.invitation_repository", inv_repo), \
             patch("app.modules.invitations.service.user_repository", user_repo), \
             patch("app.modules.invitations.service.notification_service.send_email", return_value=None):

            # 1. Pilot tries to send invite -> 403 Forbidden
            unauth_invite = client.post(
                "/invitations",
                headers={"Authorization": f"Bearer {pilot_token}"},
                json={"email": "guest@test.com", "role": "pilot"}
            )
            assert unauth_invite.status_code == 403

            # 2. Admin invites Client Primary (creates org) -> 201 Created
            create_invite_res = client.post(
                "/invitations",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={
                    "email": "client.owner@acme.com",
                    "role": "client_primary",
                    "company_name": "Acme Industries",
                }
            )
            assert create_invite_res.status_code == 201
            invite_data = create_invite_res.json()
            assert invite_data["email"] == "client.owner@acme.com"
            assert invite_data["status"] == "pending"
            token = invite_data["token"]

            # 3. Verify Token -> 200
            verify_res = client.get(f"/invitations/{token}")
            assert verify_res.status_code == 200
            assert verify_res.json()["token"] == token

            # 4. Accept Invitation -> 200 and User created
            accept_res = client.post(
                "/invitations/accept",
                json={
                    "token": token,
                    "password": "Password123!",
                    "full_name": "Acme Owner",
                    "phone_number": "+91 98765 43210",
                }
            )
            assert accept_res.status_code == 200
            auth_data = accept_res.json()
            assert "access_token" in auth_data
            assert auth_data["user"]["email"] == "client.owner@acme.com"
            assert auth_data["user"]["role"] == "client_primary"
            assert auth_data["user"]["organization_id"] is not None

            # 5. Cannot re-accept already accepted token -> 400 Bad Request
            reaccept_res = client.post(
                "/invitations/accept",
                json={
                    "token": token,
                    "password": "Password123!",
                }
            )
            assert reaccept_res.status_code == 400
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_profile_update_sends_1_day_invitation_to_team_members():
    client_id = uuid.uuid4()
    org_id = uuid.uuid4()
    client_user = User(
        id=client_id,
        email="lead@company.com",
        role=RoleEnum.CLIENT_PRIMARY,
        organization_id=org_id,
        company_name="Delta Surveys",
        is_active=True
    )
    mock_test_users[str(client_id)] = client_user
    client_token = create_access_token({"sub": str(client_id), "email": client_user.email, "role": "client_primary"})

    inv_repo = MockInvitationRepo()
    user_repo = MockUserRepoInv()

    sent_emails = []

    async def mock_send_email(to_email, subject, html_content):
        sent_emails.append({"to": to_email, "subject": subject, "html": html_content})

    app.dependency_overrides[get_db] = override_get_db

    try:
        with patch("app.security.auth.user_repository", user_repo), \
             patch("app.modules.users.service.invitation_repository", inv_repo), \
             patch("app.modules.users.service.user_repository", user_repo), \
             patch("app.modules.users.service.notification_service.send_email", side_effect=mock_send_email):

            # Client saves company profile with 2 team members
            patch_res = client.patch(
                "/users/me",
                headers={"Authorization": f"Bearer {client_token}"},
                json={
                    "full_name": "Lead Client",
                    "company_name": "Delta Surveys",
                    "phone_number": "+91 99887 76655",
                    "company_profile": {
                        "company_name": "Delta Surveys",
                        "industry": "Infrastructure",
                        "team_members": [
                            {"full_name": "Alice Engineer", "email": "alice@delta.com", "phone_number": "+91 91234 56789", "department": "Civil"},
                            {"full_name": "Bob Analyst", "email": "bob@delta.com", "phone_number": "+91 98765 43210", "department": "GIS"},
                        ]
                    }
                }
            )
            assert patch_res.status_code == 200, f"Error: {patch_res.text}"

            # Verify 2 invitation emails were dispatched with 1-day validity
            assert len(sent_emails) == 2
            recipient_emails = [e["to"] for e in sent_emails]
            assert "alice@delta.com" in recipient_emails
            assert "bob@delta.com" in recipient_emails
            assert "1 day (24 hours)" in sent_emails[0]["html"]

            # Verify invitation tokens created in inv_repo
            created_tokens = [i.token for i in mock_test_invites.values() if i.email in ["alice@delta.com", "bob@delta.com"]]
            assert len(created_tokens) == 2

            # Verify expiry is set within 1 day (around 86400s)
            for inv in mock_test_invites.values():
                if inv.email in ["alice@delta.com", "bob@delta.com"]:
                    diff = (inv.expires_at - inv.created_at).total_seconds()
                    assert 86000 <= diff <= 86500
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_admin_and_operations_invite_role_matrix():
    admin_id = uuid.uuid4()
    admin_user = User(id=admin_id, email="superadmin@latrics.com", role=RoleEnum.ADMIN, is_active=True)
    mock_test_users[str(admin_id)] = admin_user

    ops_id = uuid.uuid4()
    ops_user = User(id=ops_id, email="opsleader@latrics.com", role=RoleEnum.OPERATIONS, is_active=True)
    mock_test_users[str(ops_id)] = ops_user

    admin_token = create_access_token({"sub": str(admin_id), "email": admin_user.email, "role": "admin"})
    ops_token = create_access_token({"sub": str(ops_id), "email": ops_user.email, "role": "operations"})

    inv_repo = MockInvitationRepo()
    user_repo = MockUserRepoInv()

    app.dependency_overrides[get_db] = override_get_db

    try:
        with patch("app.security.auth.user_repository", user_repo), \
             patch("app.modules.invitations.service.invitation_repository", inv_repo), \
             patch("app.modules.invitations.service.user_repository", user_repo), \
             patch("app.modules.invitations.service.notification_service.send_email", return_value=None):

            # 1. Admin can invite: Latrics Admin, Latrics Operation, Latrics Pilot, Client
            admin_targets = [
                ("new.admin@latrics.com", "admin", None),
                ("new.ops@latrics.com", "operations", None),
                ("new.pilot@latrics.com", "pilot", None),
                ("new.client@corp.com", "client_primary", "Corp One"),
            ]
            for email, target_role, comp_name in admin_targets:
                payload = {"email": email, "role": target_role}
                if comp_name:
                    payload["company_name"] = comp_name
                res = client.post(
                    "/invitations",
                    headers={"Authorization": f"Bearer {admin_token}"},
                    json=payload,
                )
                assert res.status_code == 201, f"Admin failed to invite {target_role}: {res.text}"

            # 2. Ops CANNOT invite Admin -> 403 Forbidden
            ops_admin_invite = client.post(
                "/invitations",
                headers={"Authorization": f"Bearer {ops_token}"},
                json={"email": "unauthorized.admin@latrics.com", "role": "admin"},
            )
            assert ops_admin_invite.status_code == 403
            assert "Operations staff cannot invite Latrics Admin users" in ops_admin_invite.text

            # 3. Ops can invite: Latrics Operation, Latrics Pilot, Client
            ops_targets = [
                ("ops.invited.ops@latrics.com", "operations", None),
                ("ops.invited.pilot@latrics.com", "pilot", None),
                ("ops.invited.client@clientcorp.com", "client_primary", "Client Corp"),
            ]
            for email, target_role, comp_name in ops_targets:
                payload = {"email": email, "role": target_role}
                if comp_name:
                    payload["company_name"] = comp_name
                res = client.post(
                    "/invitations",
                    headers={"Authorization": f"Bearer {ops_token}"},
                    json=payload,
                )
                assert res.status_code == 201, f"Ops failed to invite {target_role}: {res.text}"
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_primary_client_cascade_deletion_removes_subordinates_and_org():
    from app.modules.users.repository import UserRepository
    user_repo = UserRepository()

    org_id = uuid.uuid4()
    primary_id = uuid.uuid4()
    primary_client = User(
        id=primary_id,
        email="primary@client.com",
        role=RoleEnum.CLIENT_PRIMARY,
        organization_id=org_id,
        is_active=True,
    )

    sub_id = uuid.uuid4()
    subordinate = User(
        id=sub_id,
        email="sub@client.com",
        role=RoleEnum.CLIENT_SUB,
        organization_id=org_id,
        invited_by=primary_id,
        is_active=True,
    )

    org = Organization(id=org_id, name="Primary Corp")

    deleted_objects = []

    class MockAsyncSession:
        async def execute(self, stmt):
            stmt_str = str(stmt)
            mock_res = AsyncMock()
            if "users.invited_by" in stmt_str or "users.organization_id" in stmt_str:
                if "users.id !=" in stmt_str:
                    mock_res.scalars = lambda: AsyncMock(first=lambda: None, all=lambda: [])
                    return mock_res
                mock_res.scalars = lambda: AsyncMock(all=lambda: [subordinate])
                return mock_res
            if "organizations" in stmt_str:
                mock_res.scalar_one_or_none = lambda: org
                return mock_res
            mock_res.scalars = lambda: AsyncMock(first=lambda: None, all=lambda: [])
            return mock_res

        async def delete(self, obj):
            deleted_objects.append(obj)

        async def flush(self):
            pass

    mock_db = MockAsyncSession()
    await user_repo.delete(mock_db, primary_client, soft=False)

    # Subordinate was deleted
    assert subordinate in deleted_objects
    # Organization was deleted
    assert org in deleted_objects
    # Primary client was deleted
    assert primary_client in deleted_objects


