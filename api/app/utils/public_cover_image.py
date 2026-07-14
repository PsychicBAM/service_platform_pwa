"""Resolve public marketplace cover image URLs with safe fallbacks."""

from __future__ import annotations

from typing import Any, Callable

from app.utils.marketplace_cover_image import (
    marketplace_cover_image_public_url,
    read_marketplace_cover_image,
)
from app.utils.mini_site_hero_image import resolve_mini_site_hero_image_url

_PUBLIC_UPLOAD_PREFIX = "/uploads/"


def _is_public_upload_url(url: str | None) -> bool:
    return isinstance(url, str) and url.startswith(_PUBLIC_UPLOAD_PREFIX)


def resolve_public_cover_image_url(
    *,
    settings: dict[str, Any] | None,
    services: list[Any],
    service_image_url: Callable[[Any], str | None],
) -> str | None:
    marketplace_url = marketplace_cover_image_public_url(read_marketplace_cover_image(settings))
    if _is_public_upload_url(marketplace_url):
        return marketplace_url

    hero_url = resolve_mini_site_hero_image_url(settings)
    if _is_public_upload_url(hero_url):
        return hero_url

    for service in services:
        image_url = service_image_url(service)
        if _is_public_upload_url(image_url):
            return image_url

    return None
