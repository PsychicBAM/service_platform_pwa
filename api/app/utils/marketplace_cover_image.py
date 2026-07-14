"""Helpers for persisted marketplace cover image metadata."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

from app.schemas.service_image import ServiceImageMedia

MARKETPLACE_COVER_IMAGE_KEY = "marketplace_cover_image"


def read_marketplace_cover_image(settings: dict[str, Any] | None) -> ServiceImageMedia | None:
    if not isinstance(settings, dict):
        return None
    value = settings.get(MARKETPLACE_COVER_IMAGE_KEY)
    if not isinstance(value, dict):
        return None
    url = value.get("url")
    if not isinstance(url, str) or not url.strip():
        return None
    try:
        return ServiceImageMedia.model_validate(value)
    except Exception:
        return None


def marketplace_cover_image_public_url(image: ServiceImageMedia | None) -> str | None:
    if image is None:
        return None
    return image.thumbnail_url or image.url or None


def set_marketplace_cover_image(
    settings: dict[str, Any] | None,
    image: ServiceImageMedia | None,
) -> dict[str, Any]:
    merged = deepcopy(settings) if isinstance(settings, dict) else {}
    if image is None:
        merged.pop(MARKETPLACE_COVER_IMAGE_KEY, None)
    else:
        merged[MARKETPLACE_COVER_IMAGE_KEY] = image.model_dump()
    return merged
