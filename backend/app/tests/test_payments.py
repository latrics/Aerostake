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

    async def list_by_client(self, db, client_id, skip=0, limit=100):
        return [p for p in mock_projects.values() if p.client_id == client_id]

    async def list_by_organization(self, db, organization_id, skip=0, limit=100):
        return [p for p in mock_projects.values() if getattr(p, 'organization_id', None) == organization_id]

    async def list_all(self, db, skip=0, limit=100, status=None):
        return list(mock_projects.values())


mock_invoices = {}


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

    async def list_verified_by_project(self, db, project_id):
        return [p for p in mock_payments.values() if p.project_id == project_id and p.status == PaymentStatusEnum.VERIFIED]

    async def verify(self, db, payment, verified_by_user_id, reference_code=None, notes=None):
        payment.status = PaymentStatusEnum.VERIFIED
        payment.verified_by = verified_by_user_id
        if reference_code:
            payment.reference_code = reference_code
        if notes:
            payment.notes = notes
        mock_payments[str(payment.id)] = payment
        return payment

    async def create_verified_payment(
        self, db, project_id, milestone_name, amount, payment_method=None, reference_code=None, notes=None, verified_by_user_id=None
    ):
        p_id = uuid.uuid4()
        record = PaymentRecord(
            id=p_id,
            project_id=project_id,
            milestone_name=milestone_name,
            amount_usd=amount,
            status=PaymentStatusEnum.VERIFIED,
            payment_method=payment_method or "Bank Transfer",
            reference_code=reference_code,
            notes=notes,
            verified_by=verified_by_user_id,
        )
        mock_payments[str(p_id)] = record
        return record

    async def get_next_invoice_number(self, db):
        count = len(mock_invoices)
        return f"INV-2026-{count + 1:04d}"

    async def create_invoice(
        self, db, project_id, client_id, title, bill_date, due_date, items, total_amount, notes, created_by, invoice_number=None
    ):
        from app.modules.payments.model import Invoice
        inv_id = uuid.uuid4()
        num = invoice_number or f"INV-2026-{len(mock_invoices) + 1:04d}"
        inv = Invoice(
            id=inv_id,
            invoice_number=num,
            project_id=project_id,
            client_id=client_id,
            title=title,
            bill_date=bill_date,
            due_date=due_date,
            items=items,
            subtotal_amount=total_amount,
            total_amount=total_amount,
            status="issued",
            notes=notes,
            created_by=created_by,
        )
        mock_invoices[str(inv_id)] = inv
        return inv

    async def get_invoice_by_id(self, db, invoice_id):
        return mock_invoices.get(str(invoice_id))

    async def list_invoices_by_project(self, db, project_id):
        return [inv for inv in mock_invoices.values() if inv.project_id == project_id]

    async def list_all_invoices(self, db):
        return list(mock_invoices.values())



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


def test_digital_invoice_cumulative_wallet_and_ledger():
    """Validates the exact user workflow:
    Step 1: First bill ₹1,00,000, payment received ₹60,000 -> Wallet: ₹40,000 Due (red)
    Step 2: Second bill ₹1,00,000 -> Total due rolls into ₹1,40,000 Due (red)
    Step 3: Client pays ₹2,00,000 -> Wallet: ₹60,000 Credit (green)
    Step 4: Date-wise cost ledger groups by date with proper daily totals.
    """
    client_id = uuid.uuid4()
    client_user = User(id=client_id, email="wallet_client@latrics.com", full_name="Rao Enterprise", role=RoleEnum.CLIENT, is_active=True)
    mock_users[str(client_id)] = client_user

    ops_id = uuid.uuid4()
    ops_user = User(id=ops_id, email="ops_wallet@latrics.com", role=RoleEnum.OPERATIONS, is_active=True)
    mock_users[str(ops_id)] = ops_user

    ops_token = create_access_token({"sub": str(ops_id), "email": ops_user.email, "role": "operations"})
    client_token = create_access_token({"sub": str(client_id), "email": client_user.email, "role": "client"})

    project_id = uuid.uuid4()
    project = Project(
        id=project_id,
        title="Solar Farm Drone Mapping",
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

        # ── Step 1: Generate Bill 1: ₹1,00,000 ──
        # Line items: 2 items on 2026-10-01 (Drone Rental ₹60,000, Pilot Allowance ₹40,000)
        bill1_res = client.post(
            f"/projects/{project_id}/invoices",
            headers={"Authorization": f"Bearer {ops_token}"},
            json={
                "title": "Phase 1 Mobilization & Aerial Mapping Bill",
                "bill_date": "2026-10-01",
                "due_date": "2026-10-15",
                "items": [
                    {
                        "sl_no": 1,
                        "date": "2026-10-01",
                        "item_name": "Matrice 350 RTK Drone Rental",
                        "unit": 2,
                        "price": 30000,
                        "tenure": "2 Days",
                        "total_price": 60000,
                    },
                    {
                        "sl_no": 2,
                        "date": "2026-10-01",
                        "item_name": "DGCA Certified Pilot Flight Operations",
                        "unit": 2,
                        "price": 20000,
                        "tenure": "2 Days",
                        "total_price": 40000,
                    }
                ],
                "total_amount": 100000,
                "notes": "Net 15 Days payment terms."
            }
        )
        assert bill1_res.status_code == 201
        inv1 = bill1_res.json()
        assert inv1["invoice_number"].startswith("INV-2026-")
        assert inv1["total_amount"] == 100000

        # Check Wallet: Bill ₹1,00,000, Paid ₹0 -> Wallet: ₹1,00,000 Due (red)
        wallet1_res = client.get(
            f"/projects/{project_id}/wallet",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert wallet1_res.status_code == 200
        w1 = wallet1_res.json()
        assert w1["total_billed"] == 100000
        assert w1["total_paid"] == 0
        assert w1["current_balance"] == 100000
        assert w1["status"] == "due"
        assert w1["status_color"] == "red"

        # Client pays ₹60,000
        pay1_res = client.post(
            f"/projects/{project_id}/record-payment",
            headers={"Authorization": f"Bearer {ops_token}"},
            json={
                "amount": 60000,
                "payment_date": "2026-10-02",
                "payment_method": "Bank Transfer (RTGS)",
                "reference_code": "UTR-RTGS-110022",
                "notes": "Partial milestone remittance received."
            }
        )
        assert pay1_res.status_code == 201

        # Check Wallet: ₹1,00,000 - ₹60,000 = ₹40,000 Due (red)
        wallet2_res = client.get(
            f"/projects/{project_id}/wallet",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert wallet2_res.status_code == 200
        w2 = wallet2_res.json()
        assert w2["total_billed"] == 100000
        assert w2["total_paid"] == 60000
        assert w2["current_balance"] == 40000
        assert w2["status"] == "due"
        assert w2["status_color"] == "red"
        assert "40,000" in w2["status_label"]

        # ── Step 2: Second Bill: ₹1,00,000 generated ──
        # Line item on 2026-10-03 (Orthomosaic Processing ₹1,00,000)
        bill2_res = client.post(
            f"/projects/{project_id}/invoices",
            headers={"Authorization": f"Bearer {ops_token}"},
            json={
                "title": "Phase 2 Photogrammetry & Orthomosaic Delivery",
                "bill_date": "2026-10-03",
                "items": [
                    {
                        "sl_no": 1,
                        "date": "2026-10-03",
                        "item_name": "High-Density Point Cloud Processing",
                        "unit": 1,
                        "price": 100000,
                        "tenure": "Full Dataset",
                        "total_price": 100000,
                    }
                ],
                "total_amount": 100000,
            }
        )
        assert bill2_res.status_code == 201

        # Check Wallet: Previous Due ₹40,000 + New Bill ₹1,00,000 = ₹1,40,000 Due (red)
        wallet3_res = client.get(
            f"/projects/{project_id}/wallet",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert wallet3_res.status_code == 200
        w3 = wallet3_res.json()
        assert w3["total_billed"] == 200000
        assert w3["total_paid"] == 60000
        assert w3["current_balance"] == 140000
        assert w3["status"] == "due"
        assert w3["status_color"] == "red"
        assert "140,000" in w3["status_label"]

        # ── Step 3: Client pays ₹2,00,000 ──
        # Total Due ₹1,40,000 - Payment ₹2,00,000 = Surplus ₹60,000 (Wallet: ₹60,000 Credit, green)
        pay2_res = client.post(
            f"/projects/{project_id}/record-payment",
            headers={"Authorization": f"Bearer {ops_token}"},
            json={
                "amount": 200000,
                "payment_date": "2026-10-04",
                "payment_method": "Bank Wire (NEFT)",
                "reference_code": "UTR-NEFT-998811",
                "notes": "Advance client balance payment."
            }
        )
        assert pay2_res.status_code == 201

        wallet4_res = client.get(
            f"/projects/{project_id}/wallet",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert wallet4_res.status_code == 200
        w4 = wallet4_res.json()
        assert w4["total_billed"] == 200000
        assert w4["total_paid"] == 260000
        assert w4["current_balance"] == -60000
        assert w4["status"] == "credit"
        assert w4["status_color"] == "green"
        assert w4["credit_surplus"] == 60000
        assert "60,000 Credit" in w4["status_label"]

        # ── Step 4: Date-wise Cost Ledger in Reports ──
        ledger_res = client.get(
            f"/projects/{project_id}/cost-ledger",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert ledger_res.status_code == 200
        cost_days = ledger_res.json()
        assert len(cost_days) == 2
        # Dates: 2026-10-03 (₹1,00,000) and 2026-10-01 (₹1,00,000 across 2 items)
        day_totals = {d["date"]: d["day_total"] for d in cost_days}
        assert day_totals["2026-10-01"] == 100000
        assert day_totals["2026-10-03"] == 100000
        day1 = next(d for d in cost_days if d["date"] == "2026-10-01")
        assert len(day1["items"]) == 2

        # ── Step 5: Test Client Cumulative /payments/my-wallet Sync ──
        my_wallet_res = client.get(
            "/payments/my-wallet",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert my_wallet_res.status_code == 200
        my_w = my_wallet_res.json()
        assert my_w["total_billed"] == 200000
        assert my_w["total_paid"] == 260000
        assert my_w["current_balance"] == -60000
        assert my_w["status"] == "credit"


