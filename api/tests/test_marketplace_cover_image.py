"""Tests for marketplace cover image upload and public directory fallbacks."""

from __future__ import annotations

import io

import pytest
from httpx import AsyncClient
from PIL import Image

from app.config import get_settings
from tests.conftest import BOOKING_SERVICE_PAYLOAD, activate_business, register_and_get_context


def _make_test_image_bytes(
    image_format: str = "JPEG",
    size: tuple[int, int] = (900, 600),
) -> bytes:
    image = Image.new("RGB", size, color=(30, 140, 210))
    buffer = io.BytesIO()
    image.save(buffer, format=image_format)
    return buffer.getvalue()


@pytest.fixture
def upload_root(tmp_path, monkeypatch: pytest.MonkeyPatch):
    root = tmp_path / "uploads"
    root.mkdir()
    monkeypatch.setenv("MINI_SITE_UPLOAD_ROOT", str(root))
    get_settings.cache_clear()
    yield root
    get_settings.cache_clear()


def _cover_path(business_id: str) -> str:
    return f"/api/v1/businesses/{business_id}/marketplace-cover-image"


def _public_directory_path(slug: str | None = None) -> str:
    if slug:
        return f"/api/v1/public/businesses?q={slug}"
    return "/api/v1/public/businesses"


def _service_image_path(business_id: str, service_id: str) -> str:
    return f"/api/v1/businesses/{business_id}/services/{service_id}/image"


async def _setup_active_business(async_client: AsyncClient, db_session, suffix: str) -> dict:
    ctx = await register_and_get_context(async_client, suffix)
    await activate_business(db_session, ctx["slug"])
    return ctx


async def _create_service(async_client: AsyncClient, ctx: dict) -> str:
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json=BOOKING_SERVICE_PAYLOAD,
        headers=ctx["headers"],
    )
    assert response.status_code == 201
    return response.json()["id"]


async def _directory_item(async_client: AsyncClient, slug: str) -> dict:
    response = await async_client.get("/api/v1/public/businesses?limit=50")
    assert response.status_code == 200
    matches = [row for row in response.json()["data"] if row["slug"] == slug]
    assert len(matches) == 1, f"Expected one directory row for slug {slug}"
    return matches[0]


@pytest.mark.asyncio
async def test_upload_marketplace_cover_persists_and_returns_in_public_directory(
    async_client: AsyncClient,
    db_session,
    upload_root,
) -> None:
    ctx = await _setup_active_business(async_client, db_session, "marketplace-cover-explicit")

    upload = await async_client.post(
        _cover_path(ctx["business_id"]),
        headers=ctx["headers"],
        files={"file": ("cover.png", io.BytesIO(_make_test_image_bytes("PNG")), "image/png")},
    )
    assert upload.status_code == 200
    image = upload.json()["image"]
    assert image["url"].startswith(f"/uploads/businesses/{ctx['business_id']}/marketplace_cover/")
    assert image["url"].endswith(".webp")

    item = await _directory_item(async_client, ctx["slug"])
    assert item["cover_image_url"] == image["thumbnail_url"] or item["cover_image_url"] == image["url"]
    assert "contact_email" not in item
    assert "settings" not in item


@pytest.mark.asyncio
async def test_public_directory_falls_back_to_mini_site_hero_image(
    async_client: AsyncClient,
    db_session,
    upload_root,
) -> None:
    ctx = await _setup_active_business(async_client, db_session, "marketplace-cover-hero-fallback")

    hero_upload = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/mini-site-media/upload",
        headers=ctx["headers"],
        data={"template": "clean", "slot": "heroImage"},
        files={"file": ("hero.jpg", io.BytesIO(_make_test_image_bytes()), "image/jpeg")},
    )
    assert hero_upload.status_code == 200
    hero_media = hero_upload.json()["media"]
    hero_url = hero_media["thumbnail_url"] or hero_media["url"]

    item = await _directory_item(async_client, ctx["slug"])
    assert item["cover_image_url"] == hero_url


@pytest.mark.asyncio
async def test_public_directory_falls_back_to_first_service_image(
    async_client: AsyncClient,
    db_session,
    upload_root,
) -> None:
    ctx = await _setup_active_business(async_client, db_session, "marketplace-cover-service-fallback")
    service_id = await _create_service(async_client, ctx)

    service_upload = await async_client.post(
        _service_image_path(ctx["business_id"], service_id),
        headers=ctx["headers"],
        files={"file": ("service.jpg", io.BytesIO(_make_test_image_bytes()), "image/jpeg")},
    )
    assert service_upload.status_code == 200
    service_url = service_upload.json()["image"]["thumbnail_url"]

    item = await _directory_item(async_client, ctx["slug"])
    assert item["cover_image_url"] == service_url


@pytest.mark.asyncio
async def test_explicit_marketplace_cover_takes_priority_over_service_image(
    async_client: AsyncClient,
    db_session,
    upload_root,
) -> None:
    ctx = await _setup_active_business(async_client, db_session, "marketplace-cover-priority")
    service_id = await _create_service(async_client, ctx)

    service_upload = await async_client.post(
        _service_image_path(ctx["business_id"], service_id),
        headers=ctx["headers"],
        files={"file": ("service.jpg", io.BytesIO(_make_test_image_bytes()), "image/jpeg")},
    )
    assert service_upload.status_code == 200

    cover_upload = await async_client.post(
        _cover_path(ctx["business_id"]),
        headers=ctx["headers"],
        files={"file": ("cover.jpg", io.BytesIO(_make_test_image_bytes()), "image/jpeg")},
    )
    assert cover_upload.status_code == 200
    cover_url = cover_upload.json()["image"]["thumbnail_url"] or cover_upload.json()["image"]["url"]

    item = await _directory_item(async_client, ctx["slug"])
    assert item["cover_image_url"] == cover_url


@pytest.mark.asyncio
async def test_remove_marketplace_cover_falls_back_to_service_image(
    async_client: AsyncClient,
    db_session,
    upload_root,
) -> None:
    ctx = await _setup_active_business(async_client, db_session, "marketplace-cover-remove-fallback")
    service_id = await _create_service(async_client, ctx)

    service_upload = await async_client.post(
        _service_image_path(ctx["business_id"], service_id),
        headers=ctx["headers"],
        files={"file": ("service.jpg", io.BytesIO(_make_test_image_bytes()), "image/jpeg")},
    )
    assert service_upload.status_code == 200
    service_url = service_upload.json()["image"]["thumbnail_url"]

    cover_upload = await async_client.post(
        _cover_path(ctx["business_id"]),
        headers=ctx["headers"],
        files={"file": ("cover.jpg", io.BytesIO(_make_test_image_bytes()), "image/jpeg")},
    )
    assert cover_upload.status_code == 200

    remove = await async_client.delete(_cover_path(ctx["business_id"]), headers=ctx["headers"])
    assert remove.status_code == 200
    assert remove.json()["removed"] is True

    item = await _directory_item(async_client, ctx["slug"])
    assert item["cover_image_url"] == service_url


@pytest.mark.asyncio
async def test_admin_business_read_includes_marketplace_cover_image(
    async_client: AsyncClient,
    db_session,
    upload_root,
) -> None:
    ctx = await _setup_active_business(async_client, db_session, "marketplace-cover-admin-read")

    upload = await async_client.post(
        _cover_path(ctx["business_id"]),
        headers=ctx["headers"],
        files={"file": ("cover.jpg", io.BytesIO(_make_test_image_bytes()), "image/jpeg")},
    )
    assert upload.status_code == 200

    profile = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
    )
    assert profile.status_code == 200
    body = profile.json()
    assert body["marketplace_cover_image"]["url"].startswith(
        f"/uploads/businesses/{ctx['business_id']}/marketplace_cover/"
    )
