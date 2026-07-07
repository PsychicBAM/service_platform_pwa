"""Tests for admin mini-site config read/save API."""

from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.models.business import Business
from app.repositories.business_repository import DEFAULT_BUSINESS_SETTINGS
from app.utils.mini_site_config import MINI_SITE_SETTINGS_KEY
from tests.conftest import activate_business, register_and_get_context

ALLOWED_TOP_LEVEL_KEYS = {"version", "theme", "sections", "social_links"}


def _mini_site_config_path(business_id: str) -> str:
    return f"/api/v1/businesses/{business_id}/mini-site-config"


@pytest.mark.asyncio
async def test_admin_can_get_default_mini_site_config_when_none_saved(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "mini-site-get-default")
    await activate_business(db_session, ctx["slug"])

    response = await async_client.get(
        _mini_site_config_path(ctx["business_id"]),
        headers=ctx["headers"],
    )

    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == ALLOWED_TOP_LEVEL_KEYS
    assert body["version"] == 1
    assert body["theme"]["template"] == "clean"
    section_types = [section["type"] for section in body["sections"]]
    assert "hero" in section_types
    assert "contact" in section_types


@pytest.mark.asyncio
async def test_get_mini_site_config_does_not_expose_unrelated_settings_keys(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "mini-site-get-isolated")
    await activate_business(db_session, ctx["slug"])

    response = await async_client.get(
        _mini_site_config_path(ctx["business_id"]),
        headers=ctx["headers"],
    )

    assert response.status_code == 200
    body = response.json()
    assert "settings" not in body
    assert "cancellation_hours" not in body
    assert "selected_plan_intent" not in body


@pytest.mark.asyncio
async def test_admin_can_save_mini_site_config(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "mini-site-save")
    await activate_business(db_session, ctx["slug"])

    response = await async_client.put(
        _mini_site_config_path(ctx["business_id"]),
        headers=ctx["headers"],
        json={
            "version": 1,
            "theme": {
                "template": "service",
                "primary_color": "#111111",
                "accent_color": "#222222",
                "background_style": "soft",
                "button_style": "pill",
            },
            "sections": [
                {"id": "hero", "type": "hero", "enabled": True, "order": 0, "title": "Hello"},
                {"id": "about", "type": "about", "enabled": False, "order": 1},
                {"id": "services", "type": "services", "enabled": False, "order": 2},
                {"id": "contact", "type": "contact", "enabled": True, "order": 3},
                {"id": "booking_cta", "type": "booking_cta", "enabled": False, "order": 4},
            ],
            "social_links": {"website": "https://example.com"},
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["theme"]["template"] == "service"
    assert body["theme"]["primary_color"] == "#111111"
    assert body["social_links"]["website"] == "https://example.com"
    enabled_types = [section["type"] for section in body["sections"] if section["enabled"]]
    assert enabled_types == ["hero", "contact"]


@pytest.mark.asyncio
async def test_save_mini_site_config_normalizes_and_sanitizes_payload(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "mini-site-sanitize")
    await activate_business(db_session, ctx["slug"])

    response = await async_client.put(
        _mini_site_config_path(ctx["business_id"]),
        headers=ctx["headers"],
        json={
            "version": 1,
            "theme": {"template": "clean"},
            "sections": [
                {
                    "id": "hero",
                    "type": "hero",
                    "enabled": True,
                    "order": 0,
                    "title": "<script>alert(1)</script>Safe title",
                    "body": "<b>Hello</b> world",
                },
                {"id": "about", "type": "about", "enabled": False, "order": 1},
                {"id": "services", "type": "services", "enabled": False, "order": 2},
                {"id": "contact", "type": "contact", "enabled": False, "order": 3},
                {"id": "booking_cta", "type": "booking_cta", "enabled": False, "order": 4},
            ],
            "social_links": {},
        },
    )

    assert response.status_code == 200
    hero = next(section for section in response.json()["sections"] if section["type"] == "hero")
    assert hero["title"] == "alert(1)Safe title"
    assert hero["body"] == "Hello world"


@pytest.mark.asyncio
async def test_save_mini_site_config_preserves_unrelated_settings_keys(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "mini-site-preserve-settings")
    await activate_business(db_session, ctx["slug"])

    result = await db_session.execute(
        select(Business).where(Business.slug == ctx["slug"]),
    )
    business = result.scalar_one()
    business.settings = {
        **DEFAULT_BUSINESS_SETTINGS,
        "custom_future_key": True,
        "cancellation_hours": 72,
    }
    await db_session.commit()

    save_response = await async_client.put(
        _mini_site_config_path(ctx["business_id"]),
        headers=ctx["headers"],
        json={
            "version": 1,
            "theme": {"template": "clean"},
            "sections": [
                {"id": "hero", "type": "hero", "enabled": True, "order": 0},
                {"id": "about", "type": "about", "enabled": False, "order": 1},
                {"id": "services", "type": "services", "enabled": False, "order": 2},
                {"id": "contact", "type": "contact", "enabled": False, "order": 3},
                {"id": "booking_cta", "type": "booking_cta", "enabled": False, "order": 4},
            ],
            "social_links": {},
        },
    )
    assert save_response.status_code == 200
    saved_body = save_response.json()

    db_session.expire_all()
    result = await db_session.execute(
        select(Business).where(Business.slug == ctx["slug"]),
    )
    saved_business = result.scalar_one()

    assert saved_business.settings["custom_future_key"] is True
    assert saved_business.settings["cancellation_hours"] == 72
    assert MINI_SITE_SETTINGS_KEY in saved_business.settings
    stored = saved_business.settings[MINI_SITE_SETTINGS_KEY]
    assert isinstance(stored, dict)
    assert stored["version"] == saved_body["version"]
    assert stored["theme"]["template"] == saved_body["theme"]["template"]
    assert any(section["type"] == "hero" for section in stored["sections"])


@pytest.mark.asyncio
async def test_save_ignores_unknown_section_types(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "mini-site-unknown-section")
    await activate_business(db_session, ctx["slug"])

    response = await async_client.put(
        _mini_site_config_path(ctx["business_id"]),
        headers=ctx["headers"],
        json={
            "version": 1,
            "theme": {"template": "clean"},
            "sections": [
                {"id": "hero", "type": "hero", "enabled": True, "order": 0},
                {"id": "bad", "type": "webflow_canvas", "enabled": True, "order": 1},
                {"id": "about", "type": "about", "enabled": False, "order": 2},
                {"id": "services", "type": "services", "enabled": False, "order": 3},
                {"id": "contact", "type": "contact", "enabled": False, "order": 4},
                {"id": "booking_cta", "type": "booking_cta", "enabled": False, "order": 5},
            ],
            "social_links": {},
        },
    )

    assert response.status_code == 200
    section_types = [section["type"] for section in response.json()["sections"]]
    assert "webflow_canvas" not in section_types
    assert "contact" in section_types


@pytest.mark.asyncio
async def test_unauthenticated_mini_site_config_get_is_rejected(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "mini-site-unauth")
    response = await async_client.get(_mini_site_config_path(ctx["business_id"]))
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_unauthenticated_mini_site_config_put_is_rejected(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "mini-site-unauth-put")
    response = await async_client.put(
        _mini_site_config_path(ctx["business_id"]),
        json={"version": 1, "theme": {"template": "clean"}, "sections": [], "social_links": {}},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_admin_cannot_access_another_business_mini_site_config(
    async_client: AsyncClient,
    db_session,
) -> None:
    owner_a = await register_and_get_context(async_client, "mini-site-owner-a")
    owner_b = await register_and_get_context(async_client, "mini-site-owner-b")

    get_response = await async_client.get(
        _mini_site_config_path(owner_b["business_id"]),
        headers=owner_a["headers"],
    )
    assert get_response.status_code == 403

    put_response = await async_client.put(
        _mini_site_config_path(owner_b["business_id"]),
        headers=owner_a["headers"],
        json={
            "version": 1,
            "theme": {"template": "clean"},
            "sections": [
                {"id": "hero", "type": "hero", "enabled": True, "order": 0},
            ],
            "social_links": {},
        },
    )
    assert put_response.status_code == 403
