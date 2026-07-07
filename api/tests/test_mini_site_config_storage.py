"""Tests for mini-site config persistence in business.settings."""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.business import Business
from app.models.enums import BusinessStatus, OperatingMode
from app.repositories.business_repository import DEFAULT_BUSINESS_SETTINGS
from app.utils.mini_site_config import (
    MINI_SITE_SETTINGS_KEY,
    default_mini_site_config,
    get_raw_mini_site_config_from_settings,
    merge_mini_site_config_into_settings,
    normalize_mini_site_config,
    read_mini_site_config_from_settings,
    serialize_mini_site_config_for_storage,
)


def test_mini_site_settings_key_is_documented() -> None:
    assert MINI_SITE_SETTINGS_KEY == "mini_site"


def test_business_model_has_jsonb_settings_column() -> None:
    settings_column = Business.__table__.c.settings
    assert isinstance(settings_column.type, JSONB)


def test_absent_mini_site_config_is_null_in_settings() -> None:
    assert get_raw_mini_site_config_from_settings({}) is None
    assert get_raw_mini_site_config_from_settings(dict(DEFAULT_BUSINESS_SETTINGS)) is None
    assert get_raw_mini_site_config_from_settings(None) is None


def test_read_mini_site_config_from_settings_defaults_when_unset() -> None:
    config = read_mini_site_config_from_settings(dict(DEFAULT_BUSINESS_SETTINGS))
    assert config.version == 1
    assert config.theme.template == "clean"


def test_merge_stores_normalized_mini_site_config_dict() -> None:
    sample = default_mini_site_config().model_copy(
        update={
            "theme": default_mini_site_config().theme.model_copy(
                update={"primary_color": "#111111"},
            ),
        },
    )
    settings = merge_mini_site_config_into_settings(dict(DEFAULT_BUSINESS_SETTINGS), sample)

    assert MINI_SITE_SETTINGS_KEY in settings
    assert settings["cancellation_hours"] == DEFAULT_BUSINESS_SETTINGS["cancellation_hours"]
    stored = settings[MINI_SITE_SETTINGS_KEY]
    assert isinstance(stored, dict)
    assert stored["version"] == 1
    assert stored["theme"]["primary_color"] == "#111111"

    loaded = read_mini_site_config_from_settings(settings)
    assert loaded.theme.primary_color == "#111111"


def test_serialize_mini_site_config_for_storage_matches_normalized_shape() -> None:
    payload = serialize_mini_site_config_for_storage(default_mini_site_config())
    assert payload["version"] == 1
    assert "theme" in payload
    assert "sections" in payload
    assert "social_links" in payload


def test_merge_normalizes_malformed_config_before_storage() -> None:
    settings = merge_mini_site_config_into_settings(
        {},
        {
            "version": 1,
            "theme": {"template": "clean"},
            "sections": [{"id": "hero", "type": "hero", "enabled": True, "order": 0}],
            "social_links": {},
        },
    )
    stored = settings[MINI_SITE_SETTINGS_KEY]
    normalized = normalize_mini_site_config(stored)
    assert any(section.type == "contact" for section in normalized.sections)


@pytest.mark.asyncio
async def test_business_persists_null_mini_site_config_by_default(db_session: AsyncSession) -> None:
    business = Business(
        id=uuid.uuid4(),
        name="Mini Site Storage",
        slug=f"mini-site-storage-{uuid.uuid4().hex[:8]}",
        operating_mode=OperatingMode.both,
        status=BusinessStatus.active,
        settings=dict(DEFAULT_BUSINESS_SETTINGS),
    )
    db_session.add(business)
    await db_session.flush()
    await db_session.refresh(business)

    assert get_raw_mini_site_config_from_settings(business.settings) is None


@pytest.mark.asyncio
async def test_business_persists_mini_site_config_dict(db_session: AsyncSession) -> None:
    stored_config = serialize_mini_site_config_for_storage(default_mini_site_config())
    business = Business(
        id=uuid.uuid4(),
        name="Mini Site Saved",
        slug=f"mini-site-saved-{uuid.uuid4().hex[:8]}",
        operating_mode=OperatingMode.both,
        status=BusinessStatus.active,
        settings=merge_mini_site_config_into_settings(
            dict(DEFAULT_BUSINESS_SETTINGS),
            stored_config,
        ),
    )
    db_session.add(business)
    await db_session.flush()
    await db_session.refresh(business)

    raw = get_raw_mini_site_config_from_settings(business.settings)
    assert raw is not None
    assert raw["version"] == 1

    loaded = read_mini_site_config_from_settings(business.settings)
    assert loaded.version == 1
    assert any(section.type == "hero" for section in loaded.sections)
