import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.invitations.model import Invitation, InvitationStatusEnum
from app.modules.organizations.model import Organization
from app.modules.users.model import RoleEnum, User


class InvitationRepository:
    """Database access layer for invitations and organization memberships."""

    async def get_by_id(self, db: AsyncSession, invite_id: uuid.UUID) -> Optional[Invitation]:
        stmt = select(Invitation).where(Invitation.id == invite_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_token(self, db: AsyncSession, token: str) -> Optional[Invitation]:
        stmt = select(Invitation).where(Invitation.token == token)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_pending_by_email(self, db: AsyncSession, email: str) -> Optional[Invitation]:
        stmt = select(Invitation).where(
            func.lower(Invitation.email) == email.lower().strip(),
            Invitation.status == InvitationStatusEnum.PENDING,
            Invitation.expires_at > datetime.now(timezone.utc)
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def create(
        self,
        db: AsyncSession,
        email: str,
        role: RoleEnum,
        token: str,
        invited_by: uuid.UUID,
        expires_at: datetime,
        organization_id: Optional[uuid.UUID] = None,
    ) -> Invitation:
        invitation = Invitation(
            email=email.lower().strip(),
            role=role,
            token=token,
            invited_by=invited_by,
            expires_at=expires_at,
            organization_id=organization_id,
            status=InvitationStatusEnum.PENDING,
        )
        db.add(invitation)
        await db.flush()
        await db.refresh(invitation)
        return invitation

    async def mark_accepted(self, db: AsyncSession, invitation: Invitation) -> Invitation:
        invitation.status = InvitationStatusEnum.ACCEPTED
        invitation.accepted_at = datetime.now(timezone.utc)
        await db.flush()
        await db.refresh(invitation)
        return invitation

    async def count_subordinate_users(self, db: AsyncSession, organization_id: uuid.UUID) -> int:
        """Count existing client_sub users in a given organization."""
        stmt = select(func.count(User.id)).where(
            User.organization_id == organization_id,
            User.role == RoleEnum.CLIENT_SUB,
            User.is_active == True
        )
        result = await db.execute(stmt)
        return result.scalar() or 0

    async def get_or_create_organization(self, db: AsyncSession, name: str) -> Organization:
        """Get or create an organization by company name."""
        stmt = select(Organization).where(func.lower(Organization.name) == name.lower().strip())
        result = await db.execute(stmt)
        org = result.scalar_one_or_none()
        if not org:
            org = Organization(name=name.strip())
            db.add(org)
            await db.flush()
            await db.refresh(org)
        return org


invitation_repository = InvitationRepository()
