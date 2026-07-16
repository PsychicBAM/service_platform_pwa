import uuid

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.exceptions.auth import InactiveUserError, InvalidTokenError
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.services.token_service import decode_token, get_token_subject

_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise InvalidTokenError("Missing or invalid authorization header.")

    payload = decode_token(credentials.credentials)
    if payload.get("type") != "access":
        raise InvalidTokenError()

    user_id = get_token_subject(credentials.credentials)
    user = await UserRepository(db).get_by_id(user_id)
    if user is None:
        raise InvalidTokenError()

    if not user.is_active:
        raise InactiveUserError()

    return user


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Return the authenticated user when a valid bearer token is present.

    Missing or invalid tokens resolve to None so public endpoints stay usable.
    """
    if credentials is None or credentials.scheme.lower() != "bearer":
        return None
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("type") != "access":
            return None
        user_id = get_token_subject(credentials.credentials)
    except Exception:
        return None

    user = await UserRepository(db).get_by_id(user_id)
    if user is None or not user.is_active:
        return None
    return user


async def require_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    return current_user
