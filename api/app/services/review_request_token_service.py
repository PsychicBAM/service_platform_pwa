from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Literal

import jwt

from app.config import Settings, get_settings
from app.exceptions.business import (
    ReviewRequestTokenExpiredError,
    ReviewRequestTokenInvalidError,
)

ReviewTargetType = Literal["booking", "order"]


@dataclass(frozen=True)
class ReviewRequestTokenClaims:
    business_id: uuid.UUID
    target_type: ReviewTargetType
    target_id: uuid.UUID
    expires_at: datetime


def create_review_request_token(
    *,
    business_id: uuid.UUID,
    target_type: ReviewTargetType,
    target_id: uuid.UUID,
    settings: Settings | None = None,
) -> tuple[str, datetime]:
    resolved = settings or get_settings()
    now = datetime.now(UTC)
    expires_at = now + timedelta(days=resolved.review_request_token_expire_days)
    payload = {
        "type": "review_request",
        "business_id": str(business_id),
        "target_type": target_type,
        "target_id": str(target_id),
        "iat": now,
        "exp": expires_at,
    }
    token = jwt.encode(
        payload,
        resolved.jwt_secret_key,
        algorithm=resolved.jwt_algorithm,
    )
    return token, expires_at


def decode_review_request_token(
    token: str,
    settings: Settings | None = None,
) -> ReviewRequestTokenClaims:
    resolved = settings or get_settings()
    try:
        payload = jwt.decode(
            token,
            resolved.jwt_secret_key,
            algorithms=[resolved.jwt_algorithm],
        )
    except jwt.ExpiredSignatureError as exc:
        raise ReviewRequestTokenExpiredError() from exc
    except jwt.PyJWTError as exc:
        raise ReviewRequestTokenInvalidError() from exc

    if payload.get("type") != "review_request":
        raise ReviewRequestTokenInvalidError()

    try:
        business_id = uuid.UUID(str(payload["business_id"]))
        target_id = uuid.UUID(str(payload["target_id"]))
    except (KeyError, ValueError, TypeError) as exc:
        raise ReviewRequestTokenInvalidError() from exc

    target_type = payload.get("target_type")
    if target_type not in ("booking", "order"):
        raise ReviewRequestTokenInvalidError()

    exp = payload.get("exp")
    if exp is None:
        raise ReviewRequestTokenInvalidError()
    expires_at = datetime.fromtimestamp(float(exp), tz=UTC)

    return ReviewRequestTokenClaims(
        business_id=business_id,
        target_type=target_type,
        target_id=target_id,
        expires_at=expires_at,
    )


def build_review_request_url(token: str, settings: Settings | None = None) -> str:
    resolved = settings or get_settings()
    base = resolved.review_request_base_url.rstrip("/")
    return f"{base}/{token}"
