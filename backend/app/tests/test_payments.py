import pytest
import uuid
from unittest.mock import patch
from fastapi.testclient import TestClient

from app.main import app
from app.modules.payments.model import PaymentRecord, PaymentStatusEnum
from app.modules.projects.model import Project, ProjectStatusEnum
from app.modules.timeline.model import TimelineEvent
from app.modules.users.model import RoleEnum, User
from app.security.jwt import create_access_token

client = TestClient(app)

# In-memory mock store
mock_users = {}
mock_projects = {}
mock_payments = {}
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


class MockPaymentRepo:
    async def create(
        self, db, project_id, milestone_name, amount_usd, payment_method=None, reference_code=None, notes=None
    ):
        p_id = uuid.uuid4()
        record = PaymentRecord(
            id=p_id,
            project_id=project_id,
            milestone_name=milestone_name,
            amount_usd=amount_usd,
            status=PaymentStatusEnum.PENDING,
            payment_method=payment_method,
            reference_code=reference_code,
            notes=notes,
        )
        mock_payments[str(p_id)] = record
        return record

    async def get_by_id(self, db, payment_id):
        return mock_payments.get(str(payment_id))

    async def list_by_project(self, db, project_id):
        return [p for p in mock_payments.values() if p.project_id == project_id]

    async def verify(self, db, payment, verified_by_user_id, reference_code=None, notes=None):
        payment.status = PaymentStatusEnum.VERIFIED
        payment.verified_by = verified_by_user_id
        if reference_code:
            payment.reference_code = reference_code
        if notes:
            payment.notes = notes
        mock_payments[str(payment.id)] = payment
        return payment


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


def test_payments_and_verification_lifecycle():
    # 1. Setup Users: Client, Ops Manager, Finance Admin, Pilot
    client_id = uuid.uuid4()
    client_user = User(id=client_id, email="client@latrics.com", role=RoleEnum.CLIENT, is_active=True)
    mock_users[str(client_id)] = client_user

    ops_id = uuid.uuid4()
    ops_user = User(id=ops_id, email="ops@latrics.com", role=RoleEnum.OPERATIONS, is_active=True)
    mock_users[str(ops_id)] = ops_user

    admin_id = uuid.uuid4()
    admin_user = User(id=admin_id, email="admin@latrics.com", role=RoleEnum.ADMIN, is_active=True)
    mock_users[str(admin_id)] = admin_user

    pilot_id = uuid.uuid4()
    pilot_user = User(id=pilot_id, email="pilot@latrics.com", role=RoleEnum.PILOT, is_active=True)
    mock_users[str(pilot_id)] = pilot_user

    client_token = create_access_token({"sub": str(client_id), "email": client_user.email, "role": "client"})
    ops_token = create_access_token({"sub": str(ops_id), "email": ops_user.email, "role": "operations"})
    admin_token = create_access_token({"sub": str(admin_id), "email": admin_user.email, "role": "admin"})
    pilot_token = create_access_token({"sub": str(pilot_id), "email": pilot_user.email, "role": "pilot"})

    # 2. Setup Project
    project_id = uuid.uuid4()
    project = Project(
        id=project_id,
        title="Industrial Plant Photogrammetry",
        client_id=client_id,
        status=ProjectStatusEnum.ACTIVE,
    )
    mock_projects[str(project_id)] = project

    with patch("app.security.auth.user_repository", MockUserRepo()), \
         patch("app.modules.payments.service.project_repository", MockProjectRepo()), \
         patch("app.modules.payments.service.payment_repository", MockPaymentRepo()), \
         patch("app.modules.payments.service.user_repository", MockUserRepo()), \
         patch("app.modules.payments.service.timeline_service.log_event", MockTimelineService().log_event), \
         patch("app.modules.payments.service.notification_service.send_email", mock_async_send), \
         patch("app.modules.projects.service.project_repository", MockProjectRepo()):

        # 3. Security Guard Test: Client cannot issue milestone invoice charges (403 Forbidden)
        client_issue_res = client.post(
            f"/projects/{project_id}/payments",
            headers={"Authorization": f"Bearer {client_token}"},
            json={
                "milestone_name": "Initial Deposit (50%)",
                "amount_usd": 3500.0,
            }
        )
        assert client_issue_res.status_code == 403

        # 4. Ops Manager creates Milestone Invoice Charge
        issue_res = client.post(
            f"/projects/{project_id}/payments",
            headers={"Authorization": f"Bearer {ops_token}"},
            json={
                "milestone_name": "Initial Deposit (50%)",
                "amount_usd": 3500.0,
                "payment_method": "Wire Transfer",
                "reference_code": "INV-2026-0042",
                "notes": "Due prior to pilot field mobilization."
            }
        )
        assert issue_res.status_code == 201
        payment_data = issue_res.json()
        payment_id = payment_data["id"]
        assert payment_data["status"] == "pending"
        assert payment_data["amount_usd"] == 3500.0
        assert payment_data["milestone_name"] == "Initial Deposit (50%)"

        # 5. Client lists payments for project
        client_list_res = client.get(
            f"/projects/{project_id}/payments",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert client_list_res.status_code == 200
        records = client_list_res.json()
        assert len(records) == 1
        assert records[0]["id"] == payment_id

        # 6. Security Guard Test: Ops and Pilot cannot verify bank payments (403 Forbidden, Admin only!)
        ops_verify_forbidden = client.post(
            f"/payments/{payment_id}/verify",
            headers={"Authorization": f"Bearer {ops_token}"},
            json={"reference_code": "BANK-UTR-998822", "notes": "Funds confirmed in corporate account."}
        )
        assert ops_verify_forbidden.status_code == 403

        pilot_verify_forbidden = client.post(
            f"/payments/{payment_id}/verify",
            headers={"Authorization": f"Bearer {pilot_token}"},
            json={"reference_code": "BANK-UTR-998822"}
        )
        assert pilot_verify_forbidden.status_code == 403

        # 7. Finance Admin verifies Bank Remittance
        admin_verify_res = client.post(
            f"/payments/{payment_id}/verify",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "reference_code": "BANK-UTR-998822",
                "notes": "Bank ACH wire transfer cleared into Chase Commercial Account."
            }
        )
        assert admin_verify_res.status_code == 200
        verified_data = admin_verify_res.json()
        assert verified_data["status"] == "verified"
        assert verified_data["verified_by"] == str(admin_id)
        assert verified_data["reference_code"] == "BANK-UTR-998822"

        # 8. Verify Timeline Events
        project_timeline_events = [e for e in mock_timeline if str(e.project_id) == str(project_id)]
        actions = [e.action for e in project_timeline_events]
        assert "charge_created" in actions
        assert "payment_verified" in actions
