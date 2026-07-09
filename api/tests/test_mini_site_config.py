"""Unit tests for mini-site config schemas and normalization helpers."""

from __future__ import annotations

from app.schemas.mini_site import MiniSiteConfig
from app.utils.mini_site_config import (
    default_mini_site_config,
    get_enabled_mini_site_sections,
    normalize_mini_site_config,
)


def _section_types(config: MiniSiteConfig) -> list[str]:
    return [section.type for section in config.sections]


def test_default_config_includes_copy_defaults() -> None:
    config = default_mini_site_config()
    assert config.copy.hero_badge_text == "Welcome"
    assert len(config.copy.trust_cards) == 3


def test_normalize_adds_copy_for_legacy_config_without_copy() -> None:
    base = default_mini_site_config()
    config = normalize_mini_site_config(
        {
            "version": 1,
            "theme": base.theme.model_dump(),
            "sections": [section.model_dump() for section in base.sections],
            "social_links": {},
        },
    )
    assert config.copy.hero_badge_text == "Welcome"
    assert len(config.copy.trust_cards) == 3


def test_default_config_includes_background_color() -> None:
    config = default_mini_site_config()
    assert config.theme.background_color == "#f8fafc"


def test_normalize_keeps_valid_background_color() -> None:
    base = default_mini_site_config()
    config = normalize_mini_site_config(
        {
            "version": 1,
            "theme": {
                **base.theme.model_dump(),
                "background_color": "#e2e8f0",
            },
            "sections": [section.model_dump() for section in base.sections],
            "social_links": {},
        },
    )
    assert config.theme.background_color == "#e2e8f0"


def test_malformed_background_color_does_not_crash_normalization() -> None:
    base = default_mini_site_config()
    config = normalize_mini_site_config(
        {
            "version": 1,
            "theme": {
                **base.theme.model_dump(),
                "background_color": "not-a-color",
            },
            "sections": [section.model_dump() for section in base.sections],
            "social_links": {},
        },
    )
    assert config.theme.background_color == "not-a-color"


def test_default_config_version_is_one() -> None:
    config = default_mini_site_config()
    assert config.version == 1


def test_default_config_includes_required_sections() -> None:
    types = _section_types(default_mini_site_config())
    assert "hero" in types
    assert "services" in types
    assert "contact" in types
    assert "booking_cta" in types


def test_normalize_handles_none_and_bad_input_safely() -> None:
    for value in (None, "not-json", 42, []):
        config = normalize_mini_site_config(value)
        assert config.version == 1
        assert config.theme.template == "clean"
        assert len(config.sections) > 0
        assert config.social_links.model_dump() == {
            "website": None,
            "instagram": None,
            "facebook": None,
            "whatsapp": None,
            "tiktok": None,
            "telegram": None,
        }


def test_unknown_section_types_are_ignored() -> None:
    base = default_mini_site_config()
    config = normalize_mini_site_config(
        {
            "version": 1,
            "theme": base.theme.model_dump(),
            "sections": [
                {"id": "hero", "type": "hero", "enabled": True, "order": 0, "title": "Hi"},
                {"id": "bad", "type": "webflow_canvas", "enabled": True, "order": 1},
                {"id": "contact", "type": "contact", "enabled": True, "order": 2},
            ],
            "social_links": {},
        },
    )

    assert "webflow_canvas" not in _section_types(config)
    assert "hero" in _section_types(config)
    assert "contact" in _section_types(config)


def test_sections_are_sorted_by_order() -> None:
    base = default_mini_site_config()
    config = normalize_mini_site_config(
        {
            "version": 1,
            "theme": base.theme.model_dump(),
            "sections": [
                {"id": "contact", "type": "contact", "enabled": True, "order": 20},
                {"id": "hero", "type": "hero", "enabled": True, "order": 0},
                {"id": "services", "type": "services", "enabled": True, "order": 10},
            ],
            "social_links": {},
        },
    )

    orders = [section.order for section in config.sections]
    assert orders == sorted(orders)


def test_missing_required_sections_are_added() -> None:
    base = default_mini_site_config()
    config = normalize_mini_site_config(
        {
            "version": 1,
            "theme": base.theme.model_dump(),
            "sections": [
                {"id": "hero", "type": "hero", "enabled": True, "order": 0, "title": "Only hero"},
            ],
            "social_links": {},
        },
    )

    types = _section_types(config)
    assert "about" in types
    assert "services" in types
    assert "contact" in types
    assert "booking_cta" in types


def test_get_enabled_sections_returns_enabled_only_in_order() -> None:
    base = default_mini_site_config()
    config = normalize_mini_site_config(
        {
            "version": 1,
            "theme": base.theme.model_dump(),
            "sections": [
                {"id": "hero", "type": "hero", "enabled": True, "order": 0},
                {"id": "about", "type": "about", "enabled": False, "order": 1},
                {"id": "services", "type": "services", "enabled": False, "order": 2},
                {"id": "gallery", "type": "gallery", "enabled": False, "order": 3},
                {"id": "contact", "type": "contact", "enabled": True, "order": 4},
                {"id": "booking_cta", "type": "booking_cta", "enabled": False, "order": 5},
            ],
            "social_links": {},
        },
    )

    enabled = get_enabled_mini_site_sections(config)
    assert all(section.enabled for section in enabled)
    assert [section.type for section in enabled] == ["hero", "contact"]


def test_html_delimiter_characters_are_removed_from_text_fields() -> None:
    base = default_mini_site_config()
    config = normalize_mini_site_config(
        {
            "version": 1,
            "theme": base.theme.model_dump(),
            "sections": [
                {
                    "id": "hero",
                    "type": "hero",
                    "enabled": True,
                    "order": 0,
                    "title": "<script>alert(1)</script>Safe title",
                    "body": "<b>Hello</b> world",
                },
            ],
            "social_links": {},
        },
    )

    hero = next(section for section in config.sections if section.type == "hero")
    assert hero.title == "scriptalert(1)/scriptSafe title"
    assert hero.body == "bHello/b world"
    assert "<" not in hero.title
    assert ">" not in hero.title
    assert "<" not in hero.body
    assert ">" not in hero.body


def test_malformed_html_delimiter_input_is_sanitized() -> None:
    base = default_mini_site_config()
    config = normalize_mini_site_config(
        {
            "version": 1,
            "theme": base.theme.model_dump(),
            "sections": [
                {
                    "id": "hero",
                    "type": "hero",
                    "enabled": True,
                    "order": 0,
                    "title": "<script",
                    "body": "Hello <b",
                },
            ],
            "social_links": {},
        },
    )

    hero = next(section for section in config.sections if section.type == "hero")
    assert hero.title == "script"
    assert hero.body == "Hello b"
    assert "<" not in hero.title
    assert ">" not in hero.title
    assert "<" not in hero.body
    assert ">" not in hero.body


def test_malformed_items_do_not_crash_normalization() -> None:
    base = default_mini_site_config()
    config = normalize_mini_site_config(
        {
            "version": 1,
            "theme": base.theme.model_dump(),
            "sections": [
                {
                    "id": "hero",
                    "type": "hero",
                    "enabled": True,
                    "order": 0,
                    "items": [
                        "not-a-dict",
                        None,
                        42,
                        {"label": "<b>Valid</b>"},
                        {"unexpected": "ignored"},
                    ],
                },
            ],
            "social_links": {},
        },
    )

    hero = next(section for section in config.sections if section.type == "hero")
    assert hero.items is not None
    assert len(hero.items) == 1
    assert hero.items[0].label == "bValid/b"


def test_normalize_preserves_explicitly_empty_faq_items() -> None:
    base = default_mini_site_config()
    config = normalize_mini_site_config(
        {
            "version": 1,
            "theme": base.theme.model_dump(),
            "sections": [section.model_dump() for section in base.sections],
            "social_links": {},
            "copy": {
                **base.copy.model_dump(),
                "faq_items": [
                    {"question": "Visible question?", "answer": ""},
                    {"question": "", "answer": ""},
                    {"question": " ", "answer": " "},
                ],
            },
        },
    )

    assert config.copy.faq_items[0].question == "Visible question?"
    assert config.copy.faq_items[0].answer == ""
    assert config.copy.faq_items[1].question == ""
    assert config.copy.faq_items[1].answer == ""
    assert config.copy.faq_items[2].question == ""
    assert config.copy.faq_items[2].answer == ""


def test_normalize_uses_default_faq_items_for_legacy_copy_without_faq_items() -> None:
    base = default_mini_site_config()
    config = normalize_mini_site_config(
        {
            "version": 1,
            "theme": base.theme.model_dump(),
            "sections": [section.model_dump() for section in base.sections],
            "social_links": {},
            "copy": {
                "hero_badge_text": "Welcome",
            },
        },
    )

    assert config.copy.faq_items[0].question == "How do I book?"


def test_normalize_preserves_explicitly_empty_cta_labels() -> None:
    base = default_mini_site_config()
    config = normalize_mini_site_config(
        {
            "version": 1,
            "theme": base.theme.model_dump(),
            "sections": [section.model_dump() for section in base.sections],
            "social_links": {},
            "copy": {
                **base.copy.model_dump(),
                "primary_cta_label": "",
                "secondary_cta_label": " ",
            },
        },
    )

    assert config.copy.primary_cta_label == ""
    assert config.copy.secondary_cta_label == ""


def test_teacher_template_normalizes_with_education_defaults() -> None:
    base = default_mini_site_config()
    config = normalize_mini_site_config(
        {
            "version": 1,
            "theme": {**base.theme.model_dump(), "template": "teacher"},
            "sections": [section.model_dump() for section in base.sections],
            "social_links": {},
        },
    )

    assert config.theme.template == "teacher"
    assert config.copy.hero_badge_text == "Private lessons & tutoring"
    assert config.copy.primary_cta_label == "Book a lesson"
