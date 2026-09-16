import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.modules.invitations.model import Invitation, InvitationStatusEnum
from app.modules.invitations.repository import invitation_repository
from app.modules.invitations.schema import AcceptInvitationRequest, InvitationCreate
from app.modules.notifications.service import notification_service
from app.modules.users.model import RoleEnum, User
from app.modules.users.repository import user_repository
from app.modules.users.schema import TokenResponse, UserOut
from app.security.auth import hash_password
from app.security.jwt import create_access_token, create_refresh_token

settings = get_settings()


class InvitationService:
    """Business logic for invitation permissions, subordinate quotas, and onboarding."""

    ALLOWED_INVITE_ROLES = {
        RoleEnum.ADMIN,
        RoleEnum.OPERATIONS,
        RoleEnum.PILOT,
        RoleEnum.CLIENT_PRIMARY,
        RoleEnum.CLIENT_SUB,
        RoleEnum.CLIENT,
    }

    async def create_invitation(
        self,
        db: AsyncSession,
        current_user: User,
        invite_in: InvitationCreate,
    ) -> Invitation:
        # 1. Enforce inviter role permission: Only admin and operations can send invitations
        if current_user.role not in [RoleEnum.ADMIN, RoleEnum.OPERATIONS]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied: Only Admin and Operations roles may send invitations.",
            )

        # 2. Enforce role-based inviting hierarchy: Ops cannot invite Admin
        if current_user.role == RoleEnum.OPERATIONS and invite_in.role == RoleEnum.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied: Operations staff cannot invite Latrics Admin users.",
            )

        # 3. Enforce target role permission: Only allowed roles can be invited
        if invite_in.role not in self.ALLOWED_INVITE_ROLES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot invite role '{invite_in.role.value}'. Allowed invite roles: {[r.value for r in self.ALLOWED_INVITE_ROLES]}",
            )

        # 4. Check if a user with this email is already registered
        existing_user = await user_repository.get_by_email(db, invite_in.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A registered user with email '{invite_in.email}' already exists.",
            )

        # 5. Handle client organizations & subordinate user quota
        org_id = invite_in.organization_id
        if invite_in.role in [RoleEnum.CLIENT_PRIMARY, RoleEnum.CLIENT]:
            if not invite_in.company_name and not org_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="company_name is required when inviting a client user.",
                )
            if invite_in.company_name:
                org = await invitation_repository.get_or_create_organization(db, invite_in.company_name)
                org_id = org.id


        elif invite_in.role == RoleEnum.CLIENT_SUB:
            if not org_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="organization_id is required when inviting a client_sub user.",
                )
            # Quota rule: Client companies have 1 primary + up to 4 subordinate users
            sub_count = await invitation_repository.count_subordinate_users(db, org_id)
            if sub_count >= 4:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Organization subordinate user quota reached (maximum 4 subordinate users per organization).",
                )

        # 5. Generate secure token & expiry (7 days)
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)

        target_role = RoleEnum.CLIENT_PRIMARY if invite_in.role in [RoleEnum.CLIENT_PRIMARY, RoleEnum.CLIENT] else invite_in.role

        invitation = await invitation_repository.create(
            db=db,
            email=invite_in.email,
            role=target_role,
            token=token,
            invited_by=current_user.id,
            expires_at=expires_at,
            organization_id=org_id,
        )

        # 6. Send invitation email notification
        invite_link = f"http://localhost:3000/accept-invite?token={token}"
        await notification_service.send_email(
            to_email=invitation.email,
            subject=f"Aerostake Invitation: Join as {invitation.role.value}",
            html_content=(
                f"<p>Hello,</p>"
                f"<p>You have been invited by {current_user.email} to join Aerostake as <b>{invitation.role.value}</b>.</p>"
                f"<p><a href='{invite_link}'>Click here to complete your account registration</a></p>"
                f"<p>This invitation token expires in 7 days.</p>"
            ),
        )

        return invitation

    async def verify_invitation_token(self, db: AsyncSession, token: str) -> Invitation:
        invitation = await invitation_repository.get_by_token(db, token)
        if not invitation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid invitation token.",
            )
        if invitation.status != InvitationStatusEnum.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invitation is no longer pending (current status: {invitation.status.value}).",
            )
        if invitation.expires_at < datetime.now(timezone.utc):
            invitation.status = InvitationStatusEnum.EXPIRED
            await db.flush()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invitation has expired. Please request a new invitation.",
            )
        return invitation

    async def accept_invitation(
        self,
        db: AsyncSession,
        payload: AcceptInvitationRequest,
    ) -> TokenResponse:
        invitation = await self.verify_invitation_token(db, payload.token)

        # Check if user already exists (e.g. provisioned during company profile setup)
        existing_user = await user_repository.get_by_email(db, invitation.email)
        if existing_user:
            hashed_pw = hash_password(payload.password)
            existing_user.hashed_password = hashed_pw
            if payload.full_name:
                existing_user.full_name = payload.full_name
            if payload.phone_number:
                existing_user.phone_number = payload.phone_number
            existing_user.is_active = True
            if invitation.organization_id and not existing_user.organization_id:
                existing_user.organization_id = invitation.organization_id
            user = existing_user
            await db.flush()
            await db.refresh(user)
        else:
            # 1. Create user through invitation
            hashed_pw = hash_password(payload.password)
            user = User(
                id=uuid.uuid4(),
                email=invitation.email,
                hashed_password=hashed_pw,
                role=invitation.role,
                organization_id=invitation.organization_id,
                invited_by=invitation.invited_by,
                full_name=payload.full_name,
                phone_number=payload.phone_number,
                is_active=True,
            )
            db.add(user)
            await db.flush()
            await db.refresh(user)

        # 2. Mark invitation accepted
        await invitation_repository.mark_accepted(db, invitation)

        # 3. Generate JWT response
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
            "organization_id": str(user.organization_id) if user.organization_id else None,
        }

        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserOut.model_validate(user),
        )


invitation_service = InvitationService()
