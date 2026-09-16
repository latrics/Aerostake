from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.invitations.schema import AcceptInvitationRequest, InvitationCreate, InvitationOut
from app.modules.invitations.service import invitation_service
from app.modules.users.model import RoleEnum, User
from app.modules.users.schema import TokenResponse
from app.security.permissions import require_role

invitations_router = APIRouter(prefix="/invitations", tags=["Invitations"])


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
