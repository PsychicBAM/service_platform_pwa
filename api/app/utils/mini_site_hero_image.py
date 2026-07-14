"""Resolve public-safe mini-site hero image URLs from business settings."""

from __future__ import annotations

from typing import Any

from app.utils.mini_site_config import read_mini_site_config_from_settings

_HERO_SLOTS_BY_TEMPLATE: dict[str, tuple[str, ...]] = {
    "portfolio": ("heroVisual",),
    "expert": ("heroImage", "profileImage"),
    "clean": ("heroImage",),
    "service": ("heroImage",),
    "clinic": ("heroImage",),
    "teacher": ("heroImage",),
    "coach": ("heroImage",),
}


def resolve_mini_site_hero_image_url(settings: dict[str, Any] | None) -> str | None:
    if not isinstance(settings, dict):
        return None

    config = read_mini_site_config_from_settings(settings)
    template = config.theme.template
    slots = _HERO_SLOTS_BY_TEMPLATE.get(template, ("heroImage",))
    bucket = config.template_media.get(template, {})
    if not isinstance(bucket, dict):
        return None

    for slot in slots:
        entry = bucket.get(slot)
        if not isinstance(entry, dict):
            continue
        for key in ("thumbnail_url", "url"):
            url = entry.get(key)
            if isinstance(url, str) and url.startswith("/uploads/"):
                return url
    return None
