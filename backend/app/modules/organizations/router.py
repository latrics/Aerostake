from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.organizations.model import Organization
from app.modules.organizations.schema import OrganizationOut
from app.modules.users.model import RoleEnum, User
from app.security.permissions import require_role

organizations_router = APIRouter(prefix="/organizations", tags=["Organizations"])


@organizations_router.get(
    "",
    response_model=List[OrganizationOut],
    status_code=status.HTTP_200_OK,
    summary="List all client organizations with subordinate capacity (Admin/Ops only)",
)
async def list_organizations(
    current_user: User = Depends(require_role(RoleEnum.ADMIN, RoleEnum.OPERATIONS)),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all client organizations and their subordinate seat usage."""
    stmt = (
        select(Organization)
        .join(User, User.organization_id == Organization.id)
        .where(
            User.role == RoleEnum.CLIENT_PRIMARY,
            User.is_active == True,
        )
        .distinct()
        .order_by(Organization.name.asc())
    )
    result = await db.execute(stmt)
    orgs = result.scalars().all()


    response: List[OrganizationOut] = []
    for org in orgs:
        # Count subordinate active users
        count_stmt = select(func.count(User.id)).where(
            User.organization_id == org.id,
            User.role == RoleEnum.CLIENT_SUB,
            User.is_active == True,
        )
        count_res = await db.execute(count_stmt)
        sub_count = count_res.scalar() or 0

        response.append(
            OrganizationOut(
                id=org.id,
                name=org.name,
                subordinate_count=sub_count,
                max_subordinates=4,
                created_at=org.created_at,
                updated_at=org.updated_at,
            )
        )

    return response
