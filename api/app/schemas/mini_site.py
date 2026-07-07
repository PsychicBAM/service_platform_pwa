"""Pydantic schemas for Pro mini-site builder configuration (version 1)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

MiniSiteTemplate = Literal["clean", "service", "expert", "clinic", "portfolio"]
MiniSiteBackgroundStyle = Literal["light", "soft", "dark"]
MiniSiteButtonStyle = Literal["rounded", "pill", "square"]
MiniSiteSectionType = Literal[
    "hero",
    "about",
    "services",
    "benefits",
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


class MiniSiteConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: Literal[1] = Field(default=MINI_SITE_CONFIG_VERSION)
    theme: MiniSiteTheme
    sections: list[MiniSiteSection]
    social_links: MiniSiteSocialLinks = Field(default_factory=MiniSiteSocialLinks)
