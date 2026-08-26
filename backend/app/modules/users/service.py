import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
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


user_service = UserService()
