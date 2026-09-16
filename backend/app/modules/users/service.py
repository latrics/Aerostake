import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.modules.invitations.model import InvitationStatusEnum
from app.modules.invitations.repository import invitation_repository
from app.modules.notifications.service import notification_service
from app.modules.users.model import RoleEnum, User
from app.modules.users.repository import user_repository
from app.modules.users.schema import (
    TokenResponse,
    UserCreate,
    UserLogin,
    UserOut,
)
from app.security.auth import hash_password, verify_password
from app.security.jwt import create_access_token, create_refresh_token, decode_token

settings = get_settings()


class UserService:
    """Business logic for User authentication, registration, and token lifecycle."""

    async def signup(self, db: AsyncSession, user_in: UserCreate) -> TokenResponse:
        existing = await user_repository.get_by_email(db, user_in.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email already exists",
            )

        hashed_pw = hash_password(user_in.password)
        role = user_in.role or RoleEnum.CLIENT

        user = await user_repository.create(
            db=db,
            email=user_in.email,
            hashed_password=hashed_pw,
            role=role,
        )

        return self._generate_auth_response(user)

    async def login(self, db: AsyncSession, login_in: UserLogin) -> TokenResponse:
        user = await user_repository.get_by_email(db, login_in.email)
        if not user or not verify_password(login_in.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated",
            )

        return self._generate_auth_response(user)

    async def refresh_access_token(self, db: AsyncSession, refresh_token: str) -> TokenResponse:
        payload = decode_token(refresh_token)
        if payload is None or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id_str = payload.get("sub")
        if not user_id_str:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token payload",
            )

        try:
            user_uuid = uuid.UUID(user_id_str)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid user ID format in refresh token",
            )

        user = await user_repository.get_by_id(db, user_uuid)
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account no longer active or exists",
            )

        return self._generate_auth_response(user)

    def _generate_auth_response(self, user: User) -> TokenResponse:
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
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

    async def list_users(
        self,
        db: AsyncSession,
        role: Optional[RoleEnum] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[UserOut]:
        users = await user_repository.list_users(db, role=role, skip=skip, limit=limit)
        return [UserOut.model_validate(u) for u in users]

    async def create_user_admin(self, db: AsyncSession, user_in: UserCreate) -> UserOut:
        existing = await user_repository.get_by_email(db, user_in.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email already exists",
            )

        hashed_pw = hash_password(user_in.password)
        role = user_in.role or RoleEnum.CLIENT

        user = await user_repository.create(
            db=db,
            email=user_in.email,
            hashed_password=hashed_pw,
            role=role,
        )
        return UserOut.model_validate(user)

    async def register_device_token(
        self,
        db: AsyncSession,
        current_user: User,
        device_token: str,
    ) -> UserOut:
        updated_user = await user_repository.update_device_token(
            db=db,
            user=current_user,
            device_token=device_token,
        )
        return UserOut.model_validate(updated_user)

    async def update_profile(
        self,
        db: AsyncSession,
        current_user: User,
        full_name: Optional[str] = None,
        email: Optional[str] = None,
        company_name: Optional[str] = None,
        phone_number: Optional[str] = None,
        designation: Optional[str] = None,
        company_profile: Optional[dict] = None,
    ) -> UserOut:
        # Check email uniqueness if email is changing
        if email is not None and email.strip().lower() != current_user.email.lower():
            clean_email = email.strip().lower()
            existing = await user_repository.get_by_email(db, clean_email)
            if existing and existing.id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A user with this email address already exists",
                )

        # 1. Ensure organization workspace is linked for client
        effective_company_name = (
            company_name
            or (company_profile.get("company_name") if isinstance(company_profile, dict) else None)
            or current_user.company_name
        )
        if effective_company_name and not current_user.organization_id:
            org = await invitation_repository.get_or_create_organization(db, effective_company_name)
            current_user.organization_id = org.id

        updated_user = await user_repository.update_profile(
            db=db,
            user=current_user,
            full_name=full_name,
            email=email,
            company_name=effective_company_name,
            phone_number=phone_number,
            designation=designation,
            company_profile=company_profile,
        )

        # 2. If company_profile has team_members, issue 1-day invitations & send invite emails
        if company_profile and isinstance(company_profile, dict):
            team_members = company_profile.get("team_members", [])
            if isinstance(team_members, list):
                for member in team_members:
                    if not isinstance(member, dict):
                        continue
                    m_email = member.get("email") or member.get("email_address")
                    if not m_email or not isinstance(m_email, str) or not m_email.strip():
                        continue

                    clean_email = m_email.strip().lower()
                    member_name = member.get("full_name") or member.get("name") or "Team Member"
                    member_phone = member.get("phone_number") or member.get("phone")
                    member_dept = member.get("department") or member.get("designation")

                    # Check or provision user record for project communication dropdowns
                    existing_user = await user_repository.get_by_email(db, clean_email)
                    if not existing_user:
                        hashed_temp = hash_password(secrets.token_urlsafe(16))
                        await user_repository.create(
                            db=db,
                            email=clean_email,
                            hashed_password=hashed_temp,
                            role=RoleEnum.CLIENT_SUB,
                            organization_id=current_user.organization_id,
                            invited_by=current_user.id,
                            full_name=member_name,
                            company_name=effective_company_name,
                            phone_number=member_phone,
                        )
                    else:
                        if not existing_user.organization_id and current_user.organization_id:
                            existing_user.organization_id = current_user.organization_id
                        if not existing_user.company_name and effective_company_name:
                            existing_user.company_name = effective_company_name
                        if member_name and not existing_user.full_name:
                            existing_user.full_name = member_name
                        if member_phone and not existing_user.phone_number:
                            existing_user.phone_number = member_phone
                        await db.flush()

                    # Generate 1-day invitation token (24 hours validity)
                    token = secrets.token_urlsafe(32)
                    expires_at = datetime.now(timezone.utc) + timedelta(days=1)

                    pending_invite = await invitation_repository.get_pending_by_email(db, clean_email)
                    if pending_invite:
                        pending_invite.token = token
                        pending_invite.expires_at = expires_at
                        pending_invite.status = InvitationStatusEnum.PENDING
                        pending_invite.organization_id = current_user.organization_id
                        pending_invite.invited_by = current_user.id
                        await db.flush()
                    else:
                        await invitation_repository.create(
                            db=db,
                            email=clean_email,
                            role=RoleEnum.CLIENT_SUB,
                            token=token,
                            invited_by=current_user.id,
                            expires_at=expires_at,
                            organization_id=current_user.organization_id,
                        )

                    # Send Invitation Email (valid for 1 day)
                    invite_link = f"http://localhost:3000/accept-invite?token={token}"
                    inviter_display = current_user.full_name or current_user.email
                    comp_display = effective_company_name or "Aerostake Organization"

                    await notification_service.send_email(
                        to_email=clean_email,
                        subject=f"Aerostake Invitation: Join {comp_display} Team on Aerostake",
                        html_content=(
                            f"<div style='font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 8px; background-color: #ffffff;'>"
                            f"<h2 style='color: #09090b; font-size: 20px; font-weight: 800; margin-top: 0; padding-bottom: 12px; border-bottom: 2px solid #09090b;'>Aerostake — Team Invitation</h2>"
                            f"<p style='font-size: 15px; color: #18181b;'>Hello <strong>{member_name}</strong>,</p>"
                            f"<p style='font-size: 14px; color: #3f3f46; line-height: 1.5;'><strong>{inviter_display}</strong> has added you to the <strong>{comp_display}</strong> team on the <strong>Aerostake Joint Ownership & Drone Survey Portal</strong> as a Client Team Member.</p>"
                            f"<p style='font-size: 14px; color: #3f3f46; line-height: 1.5;'>Please click the button below to accept your invitation, set your password, and access your project communications workspace:</p>"
                            f"<div style='margin: 28px 0;'>"
                            f"<a href='{invite_link}' style='background-color: #09090b; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 14px; display: inline-block;'>Accept Invitation & Set Password</a>"
                            f"</div>"
                            f"<div style='background-color: #f4f4f5; border-left: 4px solid #09090b; padding: 12px 16px; border-radius: 4px; margin: 20px 0;'>"
                            f"<p style='margin: 0; font-size: 13px; color: #18181b; font-weight: 700;'>⏳ Important Validity Notice:</p>"
                            f"<p style='margin: 4px 0 0 0; font-size: 13px; color: #52525b;'>This invitation link is <strong>valid for 1 day (24 hours)</strong>. Please activate your account before the link expires.</p>"
                            f"</div>"
                            f"<hr style='border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;' />"
                            f"<p style='font-size: 12px; color: #71717a; margin: 0;'>If the button does not work, copy and paste this link into your browser:<br/><a href='{invite_link}' style='color: #09090b; word-break: break-all;'>{invite_link}</a></p>"
                            f"</div>"
                        ),
                    )

        return UserOut.model_validate(updated_user)

    async def change_password(
        self,
        db: AsyncSession,
        current_user: User,
        current_password: str,
        new_password: str,
    ) -> None:
        if not verify_password(current_password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect current password",
            )
        if len(new_password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be at least 6 characters long",
            )
        current_user.hashed_password = hash_password(new_password)
        await db.flush()
        await db.refresh(current_user)

    async def get_organization_members(
        self,
        db: AsyncSession,
        current_user: User,
    ) -> list[User]:
        return await user_repository.get_organization_team_members(db, current_user)

    async def delete_user(
        self,
        db: AsyncSession,
        current_user: User,
        user_id: uuid.UUID,
        soft: bool = False,
    ) -> dict:
        if current_user.id == user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your own active administrator account",
            )
        target_user = await user_repository.get_by_id(db, user_id)
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        target_email = target_user.email
        await user_repository.delete(db, target_user, soft=soft)
        return {"status": "success", "message": f"User {target_email} deleted successfully"}

    async def update_user_status(
        self,
        db: AsyncSession,
        current_user: User,
        user_id: uuid.UUID,
        is_active: bool,
    ) -> UserOut:
        if current_user.id == user_id and not is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate your own active account",
            )
        target_user = await user_repository.get_by_id(db, user_id)
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        updated = await user_repository.toggle_active(db, target_user, is_active)
        return UserOut.model_validate(updated)

    async def leave_organization(
        self,
        db: AsyncSession,
        current_user: User,
    ) -> UserOut:
        updated = await user_repository.leave_organization(db, current_user)
        return UserOut.model_validate(updated)

    async def delete_own_account(
        self,
        db: AsyncSession,
        current_user: User,
    ) -> dict:
        if current_user.role == RoleEnum.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Administrator accounts cannot be self-deleted",
            )
        email = current_user.email
        await user_repository.delete(db, current_user, soft=True)
        return {"status": "success", "message": f"Account {email} deleted successfully"}


user_service = UserService()


