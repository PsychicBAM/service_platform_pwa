"""Pydantic schemas for Pro mini-site builder configuration (version 1)."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

MiniSiteTemplate = Literal["clean", "service", "expert", "clinic", "portfolio"]
MiniSiteBackgroundStyle = Literal["light", "soft", "dark"]
MiniSiteButtonStyle = Literal["rounded", "pill", "square"]
MiniSiteSectionType = Literal[
    "hero",
    "about",
    "services",
    "benefits",
    "trust",
    "gallery",
    "pricing",
    "faq",
    "contact",
    "booking_cta",
]

MINI_SITE_CONFIG_VERSION: Literal[1] = 1

MINI_SITE_TEMPLATES: tuple[MiniSiteTemplate, ...] = (
    "clean",
    "service",
    "expert",
    "clinic",
    "portfolio",
)

MINI_SITE_SECTION_TYPES: tuple[MiniSiteSectionType, ...] = (
    "hero",
    "about",
    "services",
    "benefits",
    "trust",
    "gallery",
    "pricing",
    "faq",
    "contact",
    "booking_cta",
)


class MiniSiteSectionItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str | None = None
    title: str | None = None
    body: str | None = None
    value: str | None = None


class MiniSiteTheme(BaseModel):
    model_config = ConfigDict(extra="forbid")

    template: MiniSiteTemplate = "clean"
    primary_color: str = "#2563eb"
    accent_color: str = "#7c3aed"
    background_color: str = "#f8fafc"
    background_style: MiniSiteBackgroundStyle = "light"
    button_style: MiniSiteButtonStyle = "rounded"
    logo_url: str | None = None
    cover_image_url: str | None = None


class MiniSiteSection(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    type: MiniSiteSectionType
    enabled: bool
    title: str | None = None
    subtitle: str | None = None
    body: str | None = None
    items: list[MiniSiteSectionItem] | None = None
    order: int


class MiniSiteSocialLinks(BaseModel):
    model_config = ConfigDict(extra="forbid")

    website: str | None = None
    instagram: str | None = None
    facebook: str | None = None
    whatsapp: str | None = None
    tiktok: str | None = None
    telegram: str | None = None


class MiniSiteTrustCard(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str
    subtitle: str


class MiniSiteCopy(BaseModel):
    model_config = ConfigDict(extra="forbid")

    hero_badge_text: str = "Welcome"
    trust_cards: list[MiniSiteTrustCard] = Field(default_factory=list)
    benefits_section_title: str = "Why choose us"
    benefits_items: list[str] = Field(default_factory=list)
    services_section_title: str = "Our services"
    services_section_badge_text: str = "{count} available"
    contact_section_title: str = "Contact & details"
    primary_cta_label: str = "Book now"
    secondary_cta_label: str = "Submit a request"


class MiniSiteConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: Literal[1] = Field(default=MINI_SITE_CONFIG_VERSION)
    theme: MiniSiteTheme
    sections: list[MiniSiteSection]
    social_links: MiniSiteSocialLinks = Field(default_factory=MiniSiteSocialLinks)
    copy: MiniSiteCopy = Field(default_factory=MiniSiteCopy)


class MiniSiteConfigWrite(BaseModel):
    """Permissive admin write payload; normalized and sanitized before persistence."""

    model_config = ConfigDict(extra="ignore")

    version: int | None = None
    theme: dict[str, Any] | None = None
    sections: list[Any] | None = None
    social_links: dict[str, Any] | None = None
    copy: dict[str, Any] | None = None
