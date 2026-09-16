import uuid
from typing import List, Optional
from sqlalchemy import select, or_, and_, func
from sqlalchemy.ext.asyncio import AsyncSession


from app.modules.users.model import RoleEnum, User


class UserRepository:
    """Raw database operations for the User entity."""

    async def get_organization_team_members(
        self,
        db: AsyncSession,
        user: User,
    ) -> List[User]:
        conditions = []
        if user.organization_id:
            conditions.append(User.organization_id == user.organization_id)
        if user.company_name:
            conditions.append(func.lower(User.company_name) == user.company_name.lower().strip())
        conditions.append(User.invited_by == user.id)
        conditions.append(User.id == user.id)
        
        stmt = select(User).where(or_(*conditions), User.is_active == True).order_by(User.full_name.asc(), User.email.asc())
        result = await db.execute(stmt)
        return list(result.scalars().all())

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
        role: RoleEnum = RoleEnum.CLIENT_PRIMARY,
        organization_id: Optional[uuid.UUID] = None,
        invited_by: Optional[uuid.UUID] = None,
        full_name: Optional[str] = None,
        company_name: Optional[str] = None,
        phone_number: Optional[str] = None,
    ) -> User:
        user = User(
            email=email.lower().strip(),
            hashed_password=hashed_password,
            role=role,
            organization_id=organization_id,
            invited_by=invited_by,
            full_name=full_name,
            company_name=company_name,
            phone_number=phone_number,
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

    async def update_profile(
        self,
        db: AsyncSession,
        user: User,
        full_name: Optional[str] = None,
        email: Optional[str] = None,
        company_name: Optional[str] = None,
        phone_number: Optional[str] = None,
        designation: Optional[str] = None,
        company_profile: Optional[dict] = None,
    ) -> User:
        if full_name is not None:
            user.full_name = full_name.strip() if full_name else None
        if email is not None:
            user.email = email.lower().strip()
        if company_name is not None:
            user.company_name = company_name.strip() if company_name else None
        if phone_number is not None:
            user.phone_number = phone_number.strip() if phone_number else None
        if company_profile is not None:
            user.company_profile = company_profile

        if designation is not None:
            cp = dict(user.company_profile or {})
            cp["designation"] = designation.strip() if designation else ""
            if "primary_contact" in cp and isinstance(cp["primary_contact"], dict):
                cp["primary_contact"]["department"] = designation.strip() if designation else ""
            user.company_profile = cp

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

    async def delete(
        self,
        db: AsyncSession,
        user: User,
        soft: bool = False,
    ) -> None:
        # Cascade remove all subordinate accounts belonging to this client
        sub_conditions = [User.invited_by == user.id]
        if user.organization_id:
            sub_conditions.append(and_(User.organization_id == user.organization_id, User.role == RoleEnum.CLIENT_SUB))
        sub_stmt = select(User).where(or_(*sub_conditions))
        sub_res = await db.execute(sub_stmt)
        subordinates = sub_res.scalars().all()

        for sub in subordinates:
            if soft:
                sub.is_active = False
            else:
                await db.delete(sub)
        await db.flush()

        # Remove organization record if no other primary client is attached to it
        org_id = user.organization_id
        if org_id:
            other_primary = await db.execute(
                select(User).where(
                    User.organization_id == org_id,
                    User.id != user.id,
                    User.role == RoleEnum.CLIENT_PRIMARY,
                    User.is_active == True,
                )
            )
            if not other_primary.scalars().first():
                from app.modules.organizations.model import Organization
                org_res = await db.execute(select(Organization).where(Organization.id == org_id))
                org_obj = org_res.scalar_one_or_none()
                if org_obj:
                    await db.delete(org_obj)
                    await db.flush()

        if soft:
            user.is_active = False
            await db.flush()
        else:
            try:
                await db.delete(user)
                await db.flush()
            except Exception:
                await db.rollback()
                reloaded = await self.get_by_id(db, user.id)
                if reloaded:
                    reloaded.is_active = False
                    await db.flush()

    async def toggle_active(
        self,
        db: AsyncSession,
        user: User,
        is_active: bool,
    ) -> User:
        user.is_active = is_active
        # When deactivating a primary client, also deactivate all their subordinates
        if not is_active and user.role in [RoleEnum.CLIENT_PRIMARY, RoleEnum.CLIENT]:
            sub_conditions = [User.invited_by == user.id]
            if user.organization_id:
                sub_conditions.append(and_(User.organization_id == user.organization_id, User.role == RoleEnum.CLIENT_SUB))
            sub_stmt = select(User).where(or_(*sub_conditions))
            sub_res = await db.execute(sub_stmt)
            for sub in sub_res.scalars().all():
                sub.is_active = False
        await db.flush()
        await db.refresh(user)
        return user


    async def leave_organization(
        self,
        db: AsyncSession,
        user: User,
    ) -> User:
        user.organization_id = None
        user.company_name = None
        user.invited_by = None
        if user.role in [RoleEnum.CLIENT_PRIMARY, RoleEnum.CLIENT_SUB]:
            user.role = RoleEnum.CLIENT
        if user.company_profile:
            cp = dict(user.company_profile)
            cp.pop("team_members", None)
            cp.pop("company_name", None)
            cp["is_onboarded"] = False
            user.company_profile = cp
        await db.flush()
        await db.refresh(user)
        return user


user_repository = UserRepository()


