"""Helpers for per-service image metadata."""

from __future__ import annotations

from typing import Any

from app.schemas.service_image import ServiceImageMedia
from app.utils.mini_site_media_slots import (
    MINI_SITE_IMAGE_MAX_BYTES,
    MINI_SITE_IMAGE_MAX_SIZE_MESSAGE,
)

SERVICE_IMAGE_MAX_BYTES = MINI_SITE_IMAGE_MAX_BYTES
SERVICE_IMAGE_MAX_SIZE_MESSAGE = MINI_SITE_IMAGE_MAX_SIZE_MESSAGE


def read_service_image(value: Any) -> ServiceImageMedia | None:
    if not isinstance(value, dict):
        return None
    url = value.get("url")
    if not isinstance(url, str) or not url.strip():
        return None
    try:
        return ServiceImageMedia.model_validate(value)
    except Exception:
        return None


def service_image_to_dict(image: ServiceImageMedia | None) -> dict[str, Any] | None:
    if image is None:
        return None
    return image.model_dump()
