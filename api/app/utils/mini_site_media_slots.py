"""Allowed mini-site template image media slots."""

from __future__ import annotations

from app.schemas.mini_site import MiniSiteTemplate

MINI_SITE_IMAGE_MEDIA_SLOTS: dict[MiniSiteTemplate, tuple[str, ...]] = {
    "clean": ("heroImage", "servicesImage", "ctaImage"),
    "service": ("heroImage", "serviceImage", "whyChooseUsImage", "requestImage"),
    "expert": ("profileImage", "heroImage", "servicesImage", "bookingImage"),
    "clinic": ("heroImage", "doctorOrClinicImage", "servicesImage", "appointmentImage"),
    "portfolio": ("heroVisual", "featuredWorkImage", "servicesImage", "collaborationImage"),
    "teacher": ("courseImage", "lessonPreviewImage", "servicesImage", "bookingImage"),
    "coach": ("heroImage", "programImage", "servicesImage", "bookingImage"),
}

ALLOWED_IMAGE_CONTENT_TYPES: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

MINI_SITE_IMAGE_MAX_BYTES = 12 * 1024 * 1024
MINI_SITE_IMAGE_MAX_SIZE_MESSAGE = "Image is too large. Maximum size is 12 MB."


def is_allowed_mini_site_image_slot(template: MiniSiteTemplate, slot: str) -> bool:
    return slot in MINI_SITE_IMAGE_MEDIA_SLOTS.get(template, ())
