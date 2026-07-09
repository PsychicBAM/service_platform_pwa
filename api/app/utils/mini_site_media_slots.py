"""Allowed mini-site template image media slots."""

from __future__ import annotations

from app.schemas.mini_site import MiniSiteTemplate

MINI_SITE_IMAGE_MEDIA_SLOTS: dict[MiniSiteTemplate, tuple[str, ...]] = {
    "clean": ("heroImage",),
    "service": ("heroImage", "serviceImage"),
    "expert": ("profileImage", "heroImage"),
    "clinic": ("heroImage", "doctorOrClinicImage"),
    "portfolio": ("heroVisual", "featuredWorkImage"),
    "teacher": ("courseImage", "lessonPreviewImage"),
    "coach": ("heroImage", "programImage"),
}

ALLOWED_IMAGE_CONTENT_TYPES: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

MINI_SITE_IMAGE_MAX_BYTES = 5 * 1024 * 1024


def is_allowed_mini_site_image_slot(template: MiniSiteTemplate, slot: str) -> bool:
    return slot in MINI_SITE_IMAGE_MEDIA_SLOTS.get(template, ())
