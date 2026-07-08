"""Normalize and default Pro mini-site builder configuration."""

from __future__ import annotations

from typing import Any

from app.schemas.mini_site import (
    MINI_SITE_CONFIG_VERSION,
    MINI_SITE_SECTION_TYPES,
    MINI_SITE_TEMPLATES,
    MiniSiteBackgroundStyle,
    MiniSiteButtonStyle,
    MiniSiteConfig,
    MiniSiteCopy,
    MiniSiteFaqItem,
    MiniSiteSection,
    MiniSiteSectionItem,
    MiniSiteSectionType,
    MiniSiteSocialLinks,
    MiniSiteTemplate,
    MiniSiteTheme,
    MiniSiteTrustCard,
)

# Persisted at Business.settings["mini_site"] as nullable JSON (key absent = no saved config).
MINI_SITE_SETTINGS_KEY = "mini_site"

REQUIRED_MINI_SITE_SECTION_TYPES: tuple[MiniSiteSectionType, ...] = (
    "hero",
    "about",
    "services",
    "contact",
    "booking_cta",
)

_DEFAULT_SECTION_ORDERS: dict[MiniSiteSectionType, int] = {
    "hero": 0,
    "about": 1,
    "services": 2,
    "benefits": 3,
    "gallery": 4,
    "pricing": 5,
    "faq": 6,
    "contact": 7,
    "booking_cta": 8,
}

_DEFAULT_THEME = MiniSiteTheme()


def _default_copy_for_template(template: MiniSiteTemplate) -> MiniSiteCopy:
    if template == "service":
        return MiniSiteCopy(
            hero_badge_text="Service business",
            trust_cards=[
                MiniSiteTrustCard(title="Same-week", subtitle="Service availability"),
                MiniSiteTrustCard(title="Free quote", subtitle="No obligation"),
                MiniSiteTrustCard(title="Local", subtitle="Trusted nearby"),
            ],
            benefits_section_title="Why choose us",
            benefits_items=["Fast response", "Transparent pricing", "Reliable local service"],
            services_section_title="Our services",
            services_section_badge_text="{count} available",
            contact_section_title="Contact & details",
            primary_cta_label="Book now",
            secondary_cta_label="Submit a request",
        )
    if template == "expert":
        return MiniSiteCopy(
            hero_badge_text="Expert profile",
            trust_cards=[
                MiniSiteTrustCard(title="1:1", subtitle="Personal guidance"),
                MiniSiteTrustCard(title="Proven", subtitle="Approach"),
                MiniSiteTrustCard(title="Clear", subtitle="Next steps"),
            ],
            benefits_section_title="Why work with me",
            benefits_items=["Focused expertise", "Clear recommendations", "Practical next steps"],
            services_section_title="Services & sessions",
            services_section_badge_text="{count} available",
            contact_section_title="Get in touch",
            primary_cta_label="Book a session",
            secondary_cta_label="Send a request",
        )
    if template == "clinic":
        return MiniSiteCopy(
            hero_badge_text="Care & wellness",
            trust_cards=[
                MiniSiteTrustCard(title="Flexible", subtitle="Appointments"),
                MiniSiteTrustCard(title="Patient-first", subtitle="Experience"),
                MiniSiteTrustCard(title="Clear", subtitle="Contact info"),
            ],
            benefits_section_title="Why patients choose us",
            benefits_items=[
                "Flexible scheduling",
                "Clear contact details",
                "Calm, professional experience",
            ],
            services_section_title="Services & care",
            services_section_badge_text="{count} available",
            contact_section_title="Contact & location",
            primary_cta_label="Request appointment",
            secondary_cta_label="Ask a question",
        )
    if template == "portfolio":
        return MiniSiteCopy(
            hero_badge_text="Creative portfolio",
            trust_cards=[
                MiniSiteTrustCard(title="Premium", subtitle="Quality work"),
                MiniSiteTrustCard(title="Curated", subtitle="Showcase"),
                MiniSiteTrustCard(title="Bold", subtitle="Visual style"),
            ],
            benefits_section_title="What to expect",
            benefits_items=["Distinctive work", "Clear process", "Premium presentation"],
            services_section_title="Services",
            services_section_badge_text="{count} available",
            contact_section_title="Contact",
            primary_cta_label="Start a project",
            secondary_cta_label="Send inquiry",
        )
    return MiniSiteCopy(
        hero_badge_text="Welcome",
        trust_cards=[
            MiniSiteTrustCard(title="Professional", subtitle="Service quality"),
            MiniSiteTrustCard(title="Easy", subtitle="Online booking"),
            MiniSiteTrustCard(title="Local", subtitle="Trusted business"),
        ],
        benefits_section_title="Why choose us",
        benefits_items=["Quality service", "Easy booking", "Trusted locally"],
        services_section_title="Our services",
        services_section_badge_text="{count} available",
        contact_section_title="Contact & details",
        primary_cta_label="Book now",
        secondary_cta_label="Submit a request",
    )


def _sanitize_plain_text(value: str) -> str:
    return value.replace("<", "").replace(">", "").strip()


def _is_mini_site_template(value: object) -> value is MiniSiteTemplate:
    return isinstance(value, str) and value in MINI_SITE_TEMPLATES


def _is_mini_site_section_type(value: object) -> value is MiniSiteSectionType:
    return isinstance(value, str) and value in MINI_SITE_SECTION_TYPES


def _is_mini_site_background_style(value: object) -> value is MiniSiteBackgroundStyle:
    return isinstance(value, str) and value in ("light", "soft", "dark")


def _is_mini_site_button_style(value: object) -> value is MiniSiteButtonStyle:
    return isinstance(value, str) and value in ("rounded", "pill", "square")


def _sanitize_text(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    stripped = _sanitize_plain_text(value)
    return stripped if stripped else None


def _sanitize_optional_url(value: object) -> str | None:
    if value is None:
        return None
    return _sanitize_text(value)


def _create_default_section(section_type: MiniSiteSectionType, order: int) -> MiniSiteSection:
    enabled = section_type in REQUIRED_MINI_SITE_SECTION_TYPES
    base = MiniSiteSection(
        id=section_type,
        type=section_type,
        enabled=enabled,
        order=order,
    )

    if section_type == "hero":
        return base.model_copy(
            update={"title": "Welcome", "subtitle": "Quality service you can trust"},
        )
    if section_type == "about":
        return base.model_copy(
            update={
                "title": "About us",
                "body": "Tell visitors what makes your business special.",
            },
        )
    if section_type == "services":
        return base.model_copy(
            update={"title": "Our services", "subtitle": "Explore what we offer"},
        )
    if section_type == "gallery":
        return base.model_copy(
            update={
                "enabled": False,
                "title": "Gallery",
                "subtitle": "Coming soon",
            },
        )
    if section_type == "contact":
        return base.model_copy(update={"title": "Contact", "subtitle": "Get in touch"})
    if section_type == "booking_cta":
        return base.model_copy(
            update={"title": "Book now", "subtitle": "Schedule your next visit"},
        )
    if section_type == "benefits":
        return base.model_copy(update={"enabled": False, "title": "Why choose us"})
    if section_type == "pricing":
        return base.model_copy(update={"enabled": False, "title": "Pricing"})
    if section_type == "faq":
        return base.model_copy(update={"enabled": False, "title": "FAQ"})
    return base


def _build_default_sections() -> list[MiniSiteSection]:
    required = [
        _create_default_section(section_type, _DEFAULT_SECTION_ORDERS[section_type])
        for section_type in REQUIRED_MINI_SITE_SECTION_TYPES
    ]
    gallery = _create_default_section("gallery", _DEFAULT_SECTION_ORDERS["gallery"])
    faq = _create_default_section("faq", _DEFAULT_SECTION_ORDERS["faq"])
    return sorted([*required, gallery, faq], key=lambda section: section.order)


def default_mini_site_config() -> MiniSiteConfig:
    """Return a safe default mini-site configuration."""
    theme = _DEFAULT_THEME.model_copy(deep=True)
    return MiniSiteConfig(
        version=MINI_SITE_CONFIG_VERSION,
        theme=theme,
        sections=_build_default_sections(),
        social_links=MiniSiteSocialLinks(),
        copy=_default_copy_for_template(theme.template),
    )


def _normalize_trust_card(value: object, fallback: MiniSiteTrustCard) -> MiniSiteTrustCard:
    if not isinstance(value, dict):
        return fallback
    return MiniSiteTrustCard(
        title=_sanitize_text(value.get("title")) or fallback.title,
        subtitle=_sanitize_text(value.get("subtitle")) or fallback.subtitle,
    )


def _normalize_benefits_items(value: object, fallback: list[str]) -> list[str]:
    if not isinstance(value, list):
        return fallback[:3]
    items: list[str] = []
    for index in range(3):
        sanitized = _sanitize_text(value[index]) if index < len(value) else None
        items.append(sanitized or fallback[index])
    return items


def _normalize_optional_copy_field(
    input_value: dict[str, object],
    camel_key: str,
    snake_key: str,
    fallback: str,
) -> str:
    if camel_key in input_value:
        value = input_value[camel_key]
        return _sanitize_plain_text(value) if isinstance(value, str) else fallback
    if snake_key in input_value:
        value = input_value[snake_key]
        return _sanitize_plain_text(value) if isinstance(value, str) else fallback
    return fallback


def _normalize_social_link_field(value: object) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        return None
    stripped = _sanitize_plain_text(value)
    return stripped if stripped else None


def _normalize_faq_field(value: object) -> str:
    if not isinstance(value, str):
        return ""
    return _sanitize_plain_text(value)


def _normalize_faq_item(
    value: object,
    fallback: MiniSiteFaqItem,
    apply_defaults_for_missing_entry: bool,
) -> MiniSiteFaqItem:
    if not isinstance(value, dict):
        return (
            fallback
            if apply_defaults_for_missing_entry
            else MiniSiteFaqItem(question="", answer="")
        )

    return MiniSiteFaqItem(
        question=_normalize_faq_field(value["question"]) if "question" in value else fallback.question,
        answer=_normalize_faq_field(value["answer"]) if "answer" in value else fallback.answer,
    )


def _normalize_faq_items(value: object, fallback: list[MiniSiteFaqItem]) -> list[MiniSiteFaqItem]:
    if not isinstance(value, list):
        return fallback[:3]
    items: list[MiniSiteFaqItem] = []
    for index in range(3):
        entry = value[index] if index < len(value) else None
        items.append(_normalize_faq_item(entry, fallback[index], False))
    return items


def _normalize_copy(input_value: object, template: MiniSiteTemplate) -> MiniSiteCopy:
    defaults = _default_copy_for_template(template)
    if not isinstance(input_value, dict):
        return defaults

    trust_source = input_value.get("trust_cards", input_value.get("trustCards"))
    trust_cards: list[MiniSiteTrustCard] = []
    default_cards = defaults.trust_cards
    for index in range(3):
        entry = trust_source[index] if isinstance(trust_source, list) and index < len(trust_source) else {}
        trust_cards.append(_normalize_trust_card(entry, default_cards[index]))

    benefits_source = input_value.get("benefits_items", input_value.get("benefitsItems"))
    faq_source = input_value.get("faq_items", input_value.get("faqItems"))

    return MiniSiteCopy(
        hero_badge_text=_sanitize_text(
            input_value.get("hero_badge_text", input_value.get("heroBadgeText")),
        )
        or defaults.hero_badge_text,
        trust_cards=trust_cards,
        benefits_section_title=_sanitize_text(
            input_value.get("benefits_section_title", input_value.get("benefitsSectionTitle")),
        )
        or defaults.benefits_section_title,
        benefits_items=_normalize_benefits_items(benefits_source, defaults.benefits_items),
        services_section_title=_sanitize_text(
            input_value.get("services_section_title", input_value.get("servicesSectionTitle")),
        )
        or defaults.services_section_title,
        services_section_badge_text=_sanitize_text(
            input_value.get(
                "services_section_badge_text",
                input_value.get("servicesSectionBadgeText"),
            ),
        )
        or defaults.services_section_badge_text,
        contact_section_title=_sanitize_text(
            input_value.get("contact_section_title", input_value.get("contactSectionTitle")),
        )
        or defaults.contact_section_title,
        primary_cta_label=_normalize_optional_copy_field(
            input_value,
            "primaryCtaLabel",
            "primary_cta_label",
            defaults.primary_cta_label,
        ),
        secondary_cta_label=_normalize_optional_copy_field(
            input_value,
            "secondaryCtaLabel",
            "secondary_cta_label",
            defaults.secondary_cta_label,
        ),
        faq_section_title=_sanitize_text(
            input_value.get("faq_section_title", input_value.get("faqSectionTitle")),
        )
        or defaults.faq_section_title,
        faq_items=_normalize_faq_items(faq_source, defaults.faq_items),
    )


def _normalize_theme(input_value: object) -> MiniSiteTheme:
    source = input_value if isinstance(input_value, dict) else {}

    logo_url = source.get("logo_url")
    cover_image_url = source.get("cover_image_url")

    return MiniSiteTheme(
        template=source["template"]
        if _is_mini_site_template(source.get("template"))
        else _DEFAULT_THEME.template,
        primary_color=_sanitize_text(source.get("primary_color")) or _DEFAULT_THEME.primary_color,
        accent_color=_sanitize_text(source.get("accent_color")) or _DEFAULT_THEME.accent_color,
        background_color=_sanitize_text(source.get("background_color")) or _DEFAULT_THEME.background_color,
        background_style=source["background_style"]
        if _is_mini_site_background_style(source.get("background_style"))
        else _DEFAULT_THEME.background_style,
        button_style=source["button_style"]
        if _is_mini_site_button_style(source.get("button_style"))
        else _DEFAULT_THEME.button_style,
        logo_url=None if logo_url is None else _sanitize_optional_url(logo_url),
        cover_image_url=None if cover_image_url is None else _sanitize_optional_url(cover_image_url),
    )


def _normalize_section_item(value: object) -> MiniSiteSectionItem | None:
    if not isinstance(value, dict):
        return None

    fields: dict[str, str] = {}
    for key in ("label", "title", "body", "value"):
        sanitized = _sanitize_text(value.get(key))
        if sanitized is not None:
            fields[key] = sanitized

    if not fields:
        return None
    return MiniSiteSectionItem(**fields)


def _normalize_section_items(value: object) -> list[MiniSiteSectionItem] | None:
    if not isinstance(value, list):
        return None

    items = [item for item in (_normalize_section_item(entry) for entry in value) if item is not None]
    return items or None


def _normalize_section(value: object, fallback_order: int) -> MiniSiteSection | None:
    if not isinstance(value, dict):
        return None
    if not _is_mini_site_section_type(value.get("type")):
        return None

    section_type = value["type"]
    default_section = _create_default_section(section_type, fallback_order)
    order = value["order"] if isinstance(value.get("order"), int) else fallback_order
    enabled = value["enabled"] if isinstance(value.get("enabled"), bool) else default_section.enabled

    return MiniSiteSection(
        id=_sanitize_text(value.get("id")) or section_type,
        type=section_type,
        enabled=enabled,
        order=order,
        title=_sanitize_text(value.get("title")),
        subtitle=_sanitize_text(value.get("subtitle")),
        body=_sanitize_text(value.get("body")),
        items=_normalize_section_items(value.get("items")),
    )


def _normalize_social_links(input_value: object) -> MiniSiteSocialLinks:
    if not isinstance(input_value, dict):
        return MiniSiteSocialLinks()

    fields: dict[str, str] = {}
    for key in ("website", "instagram", "facebook", "whatsapp", "tiktok", "telegram"):
        if key not in input_value:
            continue
        sanitized = _normalize_social_link_field(input_value.get(key))
        if sanitized is not None:
            fields[key] = sanitized
    return MiniSiteSocialLinks(**fields)


def _ensure_required_sections(sections: list[MiniSiteSection]) -> list[MiniSiteSection]:
    by_type: dict[MiniSiteSectionType, MiniSiteSection] = {}
    for section in sections:
        if section.type not in by_type:
            by_type[section.type] = section

    for section_type in REQUIRED_MINI_SITE_SECTION_TYPES:
        if section_type not in by_type:
            by_type[section_type] = _create_default_section(
                section_type,
                _DEFAULT_SECTION_ORDERS[section_type],
            )

    if "faq" not in by_type:
        by_type["faq"] = _create_default_section("faq", _DEFAULT_SECTION_ORDERS["faq"])

    return sorted(by_type.values(), key=lambda section: section.order)


def _normalize_sections(input_value: object) -> list[MiniSiteSection]:
    if not isinstance(input_value, list):
        return _build_default_sections()

    sections = [
        section
        for index, entry in enumerate(input_value)
        if (section := _normalize_section(entry, index)) is not None
    ]
    if not sections:
        return _build_default_sections()
    return _ensure_required_sections(sections)


def normalize_mini_site_config(input_value: object) -> MiniSiteConfig:
    """Accept unknown or malformed input and return a safe mini-site config."""
    if input_value is None or not isinstance(input_value, dict):
        return default_mini_site_config()

    theme = _normalize_theme(input_value.get("theme"))
    return MiniSiteConfig(
        version=MINI_SITE_CONFIG_VERSION,
        theme=theme,
        sections=_normalize_sections(input_value.get("sections")),
        social_links=_normalize_social_links(input_value.get("social_links")),
        copy=_normalize_copy(input_value.get("copy"), theme.template),
    )


def get_enabled_mini_site_sections(config: MiniSiteConfig) -> list[MiniSiteSection]:
    """Return enabled sections sorted by order."""
    return sorted(
        (section for section in config.sections if section.enabled),
        key=lambda section: section.order,
    )


def get_raw_mini_site_config_from_settings(
    settings: dict[str, Any] | None,
) -> dict[str, Any] | None:
    """Return stored mini-site JSON from business.settings, or None when unset."""
    if not settings:
        return None
    raw = settings.get(MINI_SITE_SETTINGS_KEY)
    if raw is None:
        return None
    if isinstance(raw, dict):
        return raw
    return None


def read_mini_site_config_from_settings(settings: dict[str, Any] | None) -> MiniSiteConfig:
    """Load and normalize mini-site config from business.settings (defaults when unset)."""
    raw = get_raw_mini_site_config_from_settings(settings)
    if raw is None:
        return default_mini_site_config()
    return normalize_mini_site_config(raw)


def serialize_mini_site_config_for_storage(config: MiniSiteConfig) -> dict[str, Any]:
    """Serialize a normalized config for JSONB storage."""
    return config.model_dump(mode="json")


def merge_mini_site_config_into_settings(
    settings: dict[str, Any] | None,
    config: MiniSiteConfig | dict[str, Any] | None,
) -> dict[str, Any]:
    """Merge normalized mini-site config into business.settings without touching other keys."""
    merged = dict(settings or {})
    if config is None:
        merged.pop(MINI_SITE_SETTINGS_KEY, None)
        return merged

    normalized = (
        config if isinstance(config, MiniSiteConfig) else normalize_mini_site_config(config)
    )
    merged[MINI_SITE_SETTINGS_KEY] = serialize_mini_site_config_for_storage(normalized)
    return merged
