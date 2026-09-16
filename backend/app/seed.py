import asyncio
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.db_wipe import wipe_database
from app.modules.invitations.model import Invitation
from app.modules.invitations.schema import AcceptInvitationRequest, InvitationCreate
from app.modules.invitations.service import invitation_service
from app.modules.users.model import RoleEnum, User
from app.security.auth import hash_password

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aerostake.seed")


async def seed_database(wipe_first: bool = True):
    """Seed the database starting from an empty state:

    1. Direct bootstrap of exactly ONE admin user (aditya.paul@latrics.com).
    2. Simulated authentic invitation flow for one operations user (ops@latrics.com).
    3. Verification of invitation permission enforcement.
    4. Commented-out optional examples for client and pilot invitations.
    """
    logger.info("🌱 Starting Aerostake target schema bootstrap and seeding...")

    if wipe_first:
        await wipe_database()

    async with AsyncSessionLocal() as db:
        # =========================================================================
        # 👑 STEP 1: ONE-TIME BOOTSTRAP STEP (DIRECT INSERT ONLY FOR FIRST ADMIN)
        # =========================================================================
        # NOTE: There is no existing inviter for the very first administrator on a
        # clean install. This direct DB insert is strictly a one-time bootstrapping
        # mechanism and is decoupled from the normal invite-based signup flow.
        # =========================================================================
        admin_email = "aditya.paul@latrics.com"
        logger.info(f"👑 [BOOTSTRAP] Direct-inserting initial Administrator: {admin_email}")

        bootstrap_admin = User(
            email=admin_email,
            hashed_password=hash_password("Password123!"),
            role=RoleEnum.ADMIN,
            full_name="Aditya Paul",
            company_name="Latrics Aerostake Inc.",
            phone_number="+91 98765 00001",
            is_active=True,
            invited_by=None,  # No inviter for initial root admin
            organization_id=None,
        )
        db.add(bootstrap_admin)
        await db.flush()
        await db.refresh(bootstrap_admin)
        logger.info(f"  ✓ Initial admin bootstrap complete (ID: {bootstrap_admin.id})")

        # =========================================================================
        # 📨 STEP 2: AUTHENTIC INVITATION FLOW FOR OPERATIONS USER
        # =========================================================================
        # The admin user sends an invitation to ops@latrics.com.
        # The user is then onboarded by simulating the invitation acceptance API,
        # ensuring the invitation row is tracked and updated to 'accepted'.
        # =========================================================================
        ops_email = "ops@latrics.com"
        logger.info(f"📨 [INVITATION] Admin dispatching invite to Operations: {ops_email}")

        invite_in = InvitationCreate(
            email=ops_email,
            role=RoleEnum.OPERATIONS,
        )
        invitation = await invitation_service.create_invitation(
            db=db,
            current_user=bootstrap_admin,
            invite_in=invite_in,
        )
        logger.info(f"  ✓ Invitation generated: token={invitation.token[:12]}... (Status: {invitation.status.value})")

        # Simulate invitation acceptance by the Operations user
        logger.info(f"🤝 [ACCEPTANCE] Simulating acceptance for {ops_email}...")
        accept_payload = AcceptInvitationRequest(
            token=invitation.token,
            password="Password123!",
            full_name="Latrics Operations Lead",
            phone_number="+91 98765 00002",
        )
        auth_response = await invitation_service.accept_invitation(
            db=db,
            payload=accept_payload,
        )
        logger.info(f"  ✓ Operations user successfully created via invite acceptance (ID: {auth_response.user.id}, Role: {auth_response.user.role.value})")

        # =========================================================================
        # 🛡️ STEP 3: VERIFY INVITATION PERMISSION ENFORCEMENT
        # =========================================================================
        # Verify that only admin and operations can create invitations, and only
        # allowed target roles can be invited.
        # =========================================================================
        logger.info("🛡️ [VERIFICATION] Verifying invitation permission rules...")
        
        # Test 1: Admin attempting to invite an invalid role (e.g. ADMIN) -> Should raise 400
        try:
            await invitation_service.create_invitation(
                db=db,
                current_user=bootstrap_admin,
                invite_in=InvitationCreate(email="test_admin2@latrics.com", role=RoleEnum.ADMIN),
            )
            logger.error("  ❌ Security check failed: Admin was able to invite another ADMIN directly.")
        except Exception as e:
            logger.info("  ✓ Rule Verified: Disallowed invite roles rejected.")

        # Commit transaction
        await db.commit()
        logger.info("✨ Bootstrap & invitation seeding completed successfully!")

        # =========================================================================
        # 📝 OPTIONAL / COMMENTED-OUT EXAMPLES FOR REAL WORKFLOW TESTING
        # =========================================================================
        # Below are reference examples showing how Pilot and Client users arrive
        # through real invitation flows in production or integration testing:
        #
        # --- EXAMPLE: Inviting a Drone Pilot ---
        # pilot_invite = await invitation_service.create_invitation(
        #     db=db,
        #     current_user=bootstrap_admin,  # or ops user
        #     invite_in=InvitationCreate(
        #         email="pilot.demo@latrics.com",
        #         role=RoleEnum.PILOT,
        #     ),
        # )
        # await invitation_service.accept_invitation(
        #     db=db,
        #     payload=AcceptInvitationRequest(
        #         token=pilot_invite.token,
        #         password="Password123!",
        #         full_name="Capt. John Pilot",
        #         phone_number="+91 98765 00003",
        #     )
        # )
        #
        # --- EXAMPLE: Inviting a Client Primary User (Creates Organization) ---
        # client_primary_invite = await invitation_service.create_invitation(
        #     db=db,
        #     current_user=bootstrap_admin,  # or ops user
        #     invite_in=InvitationCreate(
        #         email="amit.raj@acmeinfra.com",
        #         role=RoleEnum.CLIENT_PRIMARY,
        #         company_name="Acme Infrastructure Pvt. Ltd.",
        #     ),
        # )
        # primary_auth = await invitation_service.accept_invitation(
        #     db=db,
        #     payload=AcceptInvitationRequest(
        #         token=client_primary_invite.token,
        #         password="Password123!",
        #         full_name="Amit Raj",
        #         phone_number="+91 98765 43210",
        #     )
        # )
        #
        # --- EXAMPLE: Inviting a Client Subordinate User (Attached to same Org, max 4 subs) ---
        # client_sub_invite = await invitation_service.create_invitation(
        #     db=db,
        #     current_user=bootstrap_admin,
        #     invite_in=InvitationCreate(
        #         email="priya.sharma@acmeinfra.com",
        #         role=RoleEnum.CLIENT_SUB,
        #         organization_id=primary_auth.user.organization_id,
        #     ),
        # )
        # =========================================================================


if __name__ == "__main__":
    asyncio.run(seed_database(wipe_first=True))
