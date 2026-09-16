from fastapi import APIRouter, Body, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.users.model import RoleEnum, User
from app.modules.users.schema import (
    ChangePasswordRequest,
    DeviceTokenRegisterRequest,
    RefreshTokenRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserOut,
    UserProfileUpdate,
    UserStatusUpdate,
)
from app.modules.users.service import user_service
from app.security.auth import get_current_user
from app.security.permissions import require_role
from app.shared.rate_limiter import auth_rate_limiter

# Auth Endpoints (/auth/*) with rate limiting
auth_router = APIRouter(prefix="/auth", tags=["Authentication"], dependencies=[Depends(auth_rate_limiter)])

# Users Endpoints (/users/*)
users_router = APIRouter(prefix="/users", tags=["Users"])


@auth_router.post(
    "/signup",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
async def signup(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new user profile and return signed JWT credentials."""
    return await user_service.signup(db, user_in)


@auth_router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="User login",
)
async def login(
    login_in: UserLogin,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate email and password, returning JWT access & refresh tokens."""
    return await user_service.login(db, login_in)


@auth_router.post(
    "/refresh",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Refresh access token",
)
async def refresh_token(
    refresh_in: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """Issue a new JWT access token using a valid refresh token."""
    return await user_service.refresh_access_token(db, refresh_in.refresh_token)


@auth_router.get(
    "/rbac-test",
    status_code=status.HTTP_200_OK,
    summary="Admin RBAC verification endpoint",
)
async def rbac_admin_test(
    current_user: User = Depends(require_role(RoleEnum.ADMIN)),
):
    """Verification endpoint gated strictly for users with ADMIN role."""
    return {
        "status": "authorized",
        "message": f"Welcome Admin {current_user.email}",
        "role": current_user.role,
    }


@users_router.get(
    "/me",
    response_model=UserOut,
    status_code=status.HTTP_200_OK,
    summary="Get current user profile",
)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    """Retrieve profile details for the currently authenticated user."""
    return current_user


@users_router.patch(
    "/me",
    response_model=UserOut,
    status_code=status.HTTP_200_OK,
    summary="Update current user profile",
)
async def update_me(
    profile_in: UserProfileUpdate = Body(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update profile information (full name, email, company name, phone number, designation)."""
    return await user_service.update_profile(
        db=db,
        current_user=current_user,
        full_name=profile_in.full_name,
        email=profile_in.email,
        company_name=profile_in.company_name,
        phone_number=profile_in.phone_number,
        designation=profile_in.designation,
        company_profile=profile_in.company_profile,
    )


@users_router.post(
    "/me/change-password",
    status_code=status.HTTP_200_OK,
    summary="Change current user password",
)
async def change_password(
    payload: ChangePasswordRequest = Body(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Verify current password and set new password for authenticated user."""
    await user_service.change_password(
        db=db,
        current_user=current_user,
        current_password=payload.current_password,
        new_password=payload.new_password,
    )
    return {"status": "success", "message": "Password updated successfully"}


@users_router.get(
    "/organization-members",
    response_model=list[UserOut],
    status_code=status.HTTP_200_OK,
    summary="Get authenticated members for current user's organization",
)
async def get_organization_members(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all active authenticated team members under the current client's company / organization."""
    return await user_service.get_organization_members(db, current_user)


@users_router.post(
    "/me/device-token",
    response_model=UserOut,
    status_code=status.HTTP_200_OK,
    summary="Register browser or mobile push device token",
)
async def register_device_token(
    payload: DeviceTokenRegisterRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register or refresh Firebase Cloud Messaging / Web Push device token for authenticated user."""
    return await user_service.register_device_token(db, current_user, payload.device_token)



@users_router.post(
    "/me/leave-organization",
    response_model=UserOut,
    status_code=status.HTTP_200_OK,
    summary="Leave organization / company workspace",
)
async def leave_organization(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Allow a client or team member to leave their current company / organization workspace."""
    return await user_service.leave_organization(db, current_user)


@users_router.delete(
    "/me",
    status_code=status.HTTP_200_OK,
    summary="Delete / deactivate own user account",
)
async def delete_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Allow an authenticated client or user to deactivate and delete their account."""
    return await user_service.delete_own_account(db, current_user)


@users_router.patch(
    "/{user_id}/status",
    response_model=UserOut,
    status_code=status.HTTP_200_OK,
    summary="Activate or deactivate user account (Admin/Ops)",
)
async def update_user_status(
    user_id: str,
    payload: UserStatusUpdate = Body(...),
    current_user: User = Depends(require_role(RoleEnum.ADMIN, RoleEnum.OPERATIONS)),
    db: AsyncSession = Depends(get_db),
):
    """Toggle a user's active status."""
    import uuid as _uuid
    try:
        u_uuid = _uuid.UUID(user_id)
    except ValueError:
        from fastapi import HTTPException
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format")
    return await user_service.update_user_status(db, current_user, u_uuid, payload.is_active)


@users_router.delete(
    "/{user_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete user account (Admin only)",
)
async def delete_user(
    user_id: str,
    soft: bool = False,
    current_user: User = Depends(require_role(RoleEnum.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete or soft-deactivate user account."""
    import uuid as _uuid
    try:
        u_uuid = _uuid.UUID(user_id)
    except ValueError:
        from fastapi import HTTPException
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format")
    return await user_service.delete_user(db, current_user, u_uuid, soft=soft)


@users_router.get(
    "",
    response_model=list[UserOut],
    status_code=status.HTTP_200_OK,
    summary="List all users with optional role filtering (Admin/Ops only)",
)
async def list_users(
    role: RoleEnum | None = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_role(RoleEnum.ADMIN, RoleEnum.OPERATIONS)),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve system user roster (e.g. licensed pilots or staff) for allocation and user management."""
    return await user_service.list_users(db, role=role, skip=skip, limit=limit)


@users_router.post(
    "",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new team member or pilot profile (Admin only)",
)
async def create_user_by_admin(
    user_in: UserCreate,
    current_user: User = Depends(require_role(RoleEnum.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Admin endpoint to provision team member profiles."""
    return await user_service.create_user_admin(db, user_in)


