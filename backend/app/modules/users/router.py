from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.users.model import RoleEnum, User
from app.modules.users.schema import (
    RefreshTokenRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserOut,
)
from app.modules.users.service import user_service
from app.security.auth import get_current_user
from app.security.permissions import require_role

# Auth Endpoints (/auth/*)
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])

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
