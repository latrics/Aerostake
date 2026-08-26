from typing import Callable
from fastapi import Depends, HTTPException, status

from app.modules.users.model import RoleEnum, User
from app.security.auth import get_current_user


def require_role(*allowed_roles: RoleEnum) -> Callable:
    """Factory creating a FastAPI dependency enforcing Role-Based Access Control (RBAC).

    Raises 403 Forbidden if the authenticated user's role is not in allowed_roles.
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of {[r.value for r in allowed_roles]} roles",
            )
        return current_user

    return role_checker
