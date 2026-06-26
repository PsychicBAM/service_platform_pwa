import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

import jwt

from app.config import get_settings
from app.exceptions.auth import InvalidTokenError

TokenType = Literal["access", "refresh"]


def create_access_token(user_id: uuid.UUID, role: str) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "type": "access",
        "role": role,
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def create_refresh_token(user_id: uuid.UUID) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "iat": now,
        "exp": now + timedelta(days=settings.refresh_token_expire_days),
    }
    return jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def decode_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    try:
        return jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except jwt.PyJWTError as exc:
        raise InvalidTokenError() from exc


def get_token_subject(token: str) -> uuid.UUID:
    payload = decode_token(token)
    subject = payload.get("sub")
    if not subject:
        raise InvalidTokenError()
    try:
        return uuid.UUID(str(subject))
    except ValueError as exc:
        raise InvalidTokenError() from exc


def get_token_type(token: str) -> TokenType:
    payload = decode_token(token)
    token_type = payload.get("type")
    if token_type not in ("access", "refresh"):
        raise InvalidTokenError()
    return token_type  # type: ignore[return-value]
