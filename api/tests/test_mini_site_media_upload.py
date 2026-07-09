"""Tests for mini-site image upload API."""

from __future__ import annotations

import io

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.config import get_settings
from app.models.business import Business
from app.utils.mini_site_config import read_mini_site_config_from_settings
from tests.conftest import activate_business, register_and_get_context


@pytest.fixture
def mini_site_upload_root(tmp_path, monkeypatch: pytest.MonkeyPatch):
    upload_root = tmp_path / "uploads"
    upload_root.mkdir()
    monkeypatch.setenv("MINI_SITE_UPLOAD_ROOT", str(upload_root))
    get_settings.cache_clear()
    yield upload_root
    get_settings.cache_clear()


def _upload_path(business_id: str) -> str:
    return f"/api/v1/businesses/{business_id}/mini-site-media/upload"


def _remove_path(business_id: str, template: str, slot: str) -> str:
    return f"/api/v1/businesses/{business_id}/mini-site-media?template={template}&slot={slot}"


@pytest.mark.asyncio
async def test_upload_rejects_unauthenticated_user(
    async_client: AsyncClient,
    db_session,
    mini_site_upload_root,
) -> None:
    ctx = await register_and_get_context(async_client, "mini-site-media-unauth")
    await activate_business(db_session, ctx["slug"])

    response = await async_client.post(
        _upload_path(ctx["business_id"]),
        data={"template": "clinic", "slot": "heroImage"},
        files={"file": ("hero.jpg", io.BytesIO(b"fakejpeg"), "image/jpeg")},
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_upload_rejects_invalid_slot(
    async_client: AsyncClient,
    db_session,
    mini_site_upload_root,
) -> None:
    ctx = await register_and_get_context(async_client, "mini-site-media-invalid-slot")
    await activate_business(db_session, ctx["slug"])

    response = await async_client.post(
        _upload_path(ctx["business_id"]),
        headers=ctx["headers"],
        data={"template": "clinic", "slot": "notARealSlot"},
        files={"file": ("hero.jpg", io.BytesIO(b"fakejpeg"), "image/jpeg")},
    )

    assert response.status_code == 400


@pytest.mark.asyncio
async def test_upload_rejects_non_image_content_type(
    async_client: AsyncClient,
    db_session,
    mini_site_upload_root,
) -> None:
    ctx = await register_and_get_context(async_client, "mini-site-media-non-image")
    await activate_business(db_session, ctx["slug"])

    response = await async_client.post(
        _upload_path(ctx["business_id"]),
        headers=ctx["headers"],
        data={"template": "clinic", "slot": "heroImage"},
        files={"file": ("notes.txt", io.BytesIO(b"hello"), "text/plain")},
    )

    assert response.status_code == 400


@pytest.mark.asyncio
async def test_upload_accepts_webp_and_stores_metadata(
    async_client: AsyncClient,
    db_session,
    mini_site_upload_root,
) -> None:
    ctx = await register_and_get_context(async_client, "mini-site-media-upload-ok")
    await activate_business(db_session, ctx["slug"])

    response = await async_client.post(
        _upload_path(ctx["business_id"]),
        headers=ctx["headers"],
        data={"template": "clinic", "slot": "heroImage", "alt": "Clinic hero"},
        files={"file": ("hero.webp", io.BytesIO(b"webp-bytes"), "image/webp")},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["template"] == "clinic"
    assert body["slot"] == "heroImage"
    assert body["media"]["kind"] == "image"
    assert body["media"]["url"].startswith("/uploads/mini_site/")
    assert body["media"]["alt"] == "Clinic hero"
    assert body["media"]["content_type"] == "image/webp"

    result = await db_session.execute(select(Business).where(Business.slug == ctx["slug"]))
    business = result.scalar_one()
    config = read_mini_site_config_from_settings(business.settings)
    assert config.template_media["clinic"]["heroImage"]["url"] == body["media"]["url"]


@pytest.mark.asyncio
async def test_remove_clears_slot_and_deletes_file(
    async_client: AsyncClient,
    db_session,
    mini_site_upload_root,
) -> None:
    ctx = await register_and_get_context(async_client, "mini-site-media-remove")
    await activate_business(db_session, ctx["slug"])

    upload_response = await async_client.post(
        _upload_path(ctx["business_id"]),
        headers=ctx["headers"],
        data={"template": "portfolio", "slot": "heroVisual"},
        files={"file": ("hero.png", io.BytesIO(b"png-bytes"), "image/png")},
    )
    assert upload_response.status_code == 200

    remove_response = await async_client.delete(
        _remove_path(ctx["business_id"], "portfolio", "heroVisual"),
        headers=ctx["headers"],
    )
    assert remove_response.status_code == 200

    result = await db_session.execute(select(Business).where(Business.slug == ctx["slug"]))
    business = result.scalar_one()
    config = read_mini_site_config_from_settings(business.settings)
    assert "portfolio" not in config.template_media or "heroVisual" not in config.template_media.get("portfolio", {})


@pytest.mark.asyncio
async def test_legacy_config_without_template_media_normalizes_safely(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "mini-site-media-legacy")
    await activate_business(db_session, ctx["slug"])

    response = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}/mini-site-config",
        headers=ctx["headers"],
    )

    assert response.status_code == 200
    body = response.json()
    assert body["template_media"] == {}
