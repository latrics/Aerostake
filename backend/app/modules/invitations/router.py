import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from pydantic import BaseModel, Field
from app.database import get_db
from app.modules.invitations.model import Invitation, InvitationStatusEnum
from app.modules.invitations.schema import AcceptInvitationRequest, InvitationCreate, InvitationOut
from app.modules.invitations.service import invitation_service
from app.modules.organizations.model import Organization
from app.modules.users.model import RoleEnum, User
from app.modules.users.schema import TokenResponse
from app.security.auth import get_current_user
from app.security.permissions import require_role

invitations_router = APIRouter(prefix="/invitations", tags=["Invitations"])


class ResendInviteRequest(BaseModel):
    email: str = Field(..., description="Recipient email address to refresh invitation for")


@invitations_router.get(
    "/organization-invites",
    response_model=list[InvitationOut],
    status_code=status.HTTP_200_OK,
    summary="Get all organization team invitations for the current user's company",
)
async def get_organization_invitations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all pending and accepted team invitations associated with the user's organization."""
    return await invitation_service.list_organization_invitations(db=db, current_user=current_user)


@invitations_router.post(
    "/organization-invites/resend",
    response_model=InvitationOut,
    status_code=status.HTTP_200_OK,
    summary="Generate or refresh an invitation token for a team member",
)
async def resend_organization_invitation(
    payload: ResendInviteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Regenerate a 24-hour invitation token for a team contact and retrieve the invite link."""
    invite = await invitation_service.refresh_member_invitation(
        db=db, current_user=current_user, email=payload.email
    )
    await db.commit()
    return invite


@invitations_router.get(
    "",
    response_model=list[InvitationOut],
    status_code=status.HTTP_200_OK,
    summary="List all user invitations with status filtering (Admin/Ops only)",
)
async def list_all_invitations(
    status: Optional[str] = None,
    current_user: User = Depends(require_role(RoleEnum.ADMIN, RoleEnum.OPERATIONS)),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all sent onboarding invitations with attribution and authentication status."""
    stmt = select(Invitation)
    if status:
        stmt = stmt.where(Invitation.status == status)
    stmt = stmt.order_by(Invitation.created_at.desc())
    res = await db.execute(stmt)
    invitations = res.scalars().all()

    # Pre-fetch organizations and users for attribution
    org_res = await db.execute(select(Organization))
    org_map = {o.id: o.name for o in org_res.scalars().all()}

    user_res = await db.execute(select(User))
    all_users = user_res.scalars().all()
    user_map = {u.id: u for u in all_users}
    user_email_set = {u.email.lower() for u in all_users}

    output: list[InvitationOut] = []
    for inv in invitations:
        inv_data = InvitationOut.model_validate(inv).model_dump()
        inv_data["organization_name"] = org_map.get(inv.organization_id)
        inviter = user_map.get(inv.invited_by)
        if inviter:
            inv_data["invited_by_name"] = inviter.full_name or inviter.email.split("@")[0]
            inv_data["invited_by_email"] = inviter.email
        inv_data["has_user_record"] = inv.email.lower() in user_email_set
        output.append(InvitationOut(**inv_data))

    return output


@invitations_router.post(
    "/{invitation_id}/revoke",
    status_code=status.HTTP_200_OK,
    summary="Revoke an invitation and remove any unauthenticated user from backend (Admin/Ops only)",
)
@invitations_router.delete(
    "/{invitation_id}",
    status_code=status.HTTP_200_OK,
    summary="Revoke an invitation and remove any unauthenticated user from backend (Admin/Ops only)",
)
async def revoke_invitation(
    invitation_id: str,
    current_user: User = Depends(require_role(RoleEnum.ADMIN, RoleEnum.OPERATIONS)),
    db: AsyncSession = Depends(get_db),
):
    """Revoke an invitation and purge unauthenticated user records from backend."""
    try:
        inv_uuid = uuid.UUID(invitation_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid invitation ID format")

    inv_res = await db.execute(select(Invitation).where(Invitation.id == inv_uuid))
    inv = inv_res.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found")

    # Mark invitation as REVOKED
    inv.status = InvitationStatusEnum.REVOKED

    # Check if a user record exists for this email
    user_res = await db.execute(select(User).where(User.email == inv.email))
    user = user_res.scalar_one_or_none()
    user_removed = False

    if user:
        # Check if the user has any accepted invitation
        acc_stmt = select(Invitation).where(
            Invitation.email == inv.email,
            Invitation.status == InvitationStatusEnum.ACCEPTED,
        )
        acc_res = await db.execute(acc_stmt)
        has_accepted = acc_res.first() is not None

        # If they haven't authenticated / accepted any invite, remove unauthenticated user record
        if not has_accepted:
            await db.delete(user)
            user_removed = True

    await db.commit()
    return {
        "status": "success",
        "message": f"Invitation for {inv.email} has been revoked successfully."
        + (" Unauthenticated user record removed from backend." if user_removed else ""),
        "user_removed": user_removed,
    }


@invitations_router.post(
    "",
    response_model=InvitationOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create and dispatch a user onboarding invitation (Admin/Ops only)",
)
async def create_invitation(
    invite_in: InvitationCreate,
    current_user: User = Depends(require_role(RoleEnum.ADMIN, RoleEnum.OPERATIONS)),
    db: AsyncSession = Depends(get_db),
):
    """Admin and Operations endpoint to invite new team members or client primary/sub users."""
    invitation = await invitation_service.create_invitation(
        db=db,
        current_user=current_user,
        invite_in=invite_in,
    )
    await db.commit()
    return invitation


@invitations_router.get(
    "/{token}",
    response_model=InvitationOut,
    status_code=status.HTTP_200_OK,
    summary="Verify an invitation token before registration",
)
async def verify_invitation(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Public token verification endpoint."""
    return await invitation_service.verify_invitation_token(db=db, token=token)


@invitations_router.post(
    "/accept",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Accept an invitation and complete user onboarding",
)
async def accept_invitation(
    payload: AcceptInvitationRequest,
    db: AsyncSession = Depends(get_db),
):
    """Onboarding signup endpoint consuming an invitation token."""
    res = await invitation_service.accept_invitation(db=db, payload=payload)
    await db.commit()
    return res
