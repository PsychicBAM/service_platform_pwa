"""Allowed mini-site template image media slots."""

from __future__ import annotations

import re

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

# Per-item Expert content images (articles / works / testimonials).
# Format: articleCover__{safeItemId} | workCover__{safeItemId} | testimonialAvatar__{safeItemId}
_EXPERT_ITEM_IMAGE_SLOT_RE = re.compile(
    r"^(articleCover|workCover|testimonialAvatar)__[A-Za-z0-9_-]{1,64}$"
)
_PORTFOLIO_ITEM_IMAGE_SLOT_RE = re.compile(
    r"^(portfolioProjectCover|portfolioTestimonialAvatar)__[A-Za-z0-9_-]{1,64}$"
)

ALLOWED_IMAGE_CONTENT_TYPES: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

MINI_SITE_IMAGE_MAX_BYTES = 12 * 1024 * 1024
MINI_SITE_IMAGE_MAX_SIZE_MESSAGE = "Image is too large. Maximum size is 12 MB."


def is_allowed_mini_site_image_slot(template: MiniSiteTemplate, slot: str) -> bool:
    if slot in MINI_SITE_IMAGE_MEDIA_SLOTS.get(template, ()):
        return True
    if template == "expert" and _EXPERT_ITEM_IMAGE_SLOT_RE.fullmatch(slot):
        return True
    if template == "portfolio" and _PORTFOLIO_ITEM_IMAGE_SLOT_RE.fullmatch(slot):
        return True
    return False
