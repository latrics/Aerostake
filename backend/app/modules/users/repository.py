import uuid
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.users.model import RoleEnum, User


class UserRepository:
    """Raw database operations for the User entity."""

    async def get_by_id(self, db: AsyncSession, user_id: uuid.UUID) -> Optional[User]:
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_email(self, db: AsyncSession, email: str) -> Optional[User]:
        stmt = select(User).where(User.email == email.lower().strip())
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def create(
        self,
        db: AsyncSession,
        email: str,
        hashed_password: str,
        role: RoleEnum = RoleEnum.CLIENT,
    ) -> User:
        user = User(
            email=email.lower().strip(),
            hashed_password=hashed_password,
            role=role,
            is_active=True,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
        return user

    async def list_users(
        self,
        db: AsyncSession,
        role: Optional[RoleEnum] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[User]:
        stmt = select(User)
        if role is not None:
            stmt = stmt.where(User.role == role)
        stmt = stmt.offset(skip).limit(limit).order_by(User.created_at.desc())
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def update_device_token(
        self,
        db: AsyncSession,
        user: User,
        device_token: Optional[str],
    ) -> User:
        user.device_token = device_token
        await db.flush()
        await db.refresh(user)
        return user

    async def get_users_by_roles(
        self,
        db: AsyncSession,
        roles: List[RoleEnum],
    ) -> List[User]:
        stmt = select(User).where(User.role.in_(roles), User.is_active == True)
        result = await db.execute(stmt)
        return list(result.scalars().all())


user_repository = UserRepository()

