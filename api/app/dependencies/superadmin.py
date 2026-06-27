from fastapi import Depends

from app.dependencies.auth import get_current_user
from app.exceptions.business import ForbiddenError
from app.models.enums import UserRole
from app.models.user import User


async def require_superadmin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != UserRole.superadmin:
        raise ForbiddenError("Superadmin access required.")
    return current_user
