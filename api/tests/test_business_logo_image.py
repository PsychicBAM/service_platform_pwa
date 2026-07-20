"""Tests for business logo image upload and removal."""

from __future__ import annotations

import io

import pytest
from httpx import AsyncClient
from PIL import Image

from app.config import get_settings
from tests.conftest import activate_business, register_and_get_context


def _make_test_image_bytes(
    image_format: str = "JPEG",
    size: tuple[int, int] = (640, 480),
) -> bytes:
    image = Image.new("RGB", size, color=(20, 160, 90))
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


def _logo_path(business_id: str) -> str:
    return f"/api/v1/businesses/{business_id}/logo-image"


async def _setup_active_business(async_client: AsyncClient, db_session, suffix: str) -> dict:
    ctx = await register_and_get_context(async_client, suffix)
    await activate_business(db_session, ctx["slug"])
    return ctx


@pytest.mark.asyncio
async def test_upload_business_logo_persists_on_admin_profile(
    async_client: AsyncClient,
    db_session,
    upload_root,
) -> None:
    ctx = await _setup_active_business(async_client, db_session, "business-logo-upload")

    upload = await async_client.post(
        _logo_path(ctx["business_id"]),
        headers=ctx["headers"],
        files={"file": ("logo.png", io.BytesIO(_make_test_image_bytes("PNG")), "image/png")},
    )
    assert upload.status_code == 200
    logo_url = upload.json()["logo_url"]
    assert logo_url.startswith(f"/uploads/businesses/{ctx['business_id']}/logo/")
    assert logo_url.endswith(".webp")

    stored = upload_root / "businesses" / ctx["business_id"] / "logo" / logo_url.rsplit("/", 1)[-1]
    assert stored.is_file()

    profile = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
    )
    assert profile.status_code == 200
    assert profile.json()["logo_url"] == logo_url


@pytest.mark.asyncio
async def test_upload_business_logo_replaces_previous_file(
    async_client: AsyncClient,
    db_session,
    upload_root,
) -> None:
    ctx = await _setup_active_business(async_client, db_session, "business-logo-replace")

    first = await async_client.post(
        _logo_path(ctx["business_id"]),
        headers=ctx["headers"],
        files={"file": ("logo1.jpg", io.BytesIO(_make_test_image_bytes()), "image/jpeg")},
    )
    assert first.status_code == 200
    first_url = first.json()["logo_url"]
    first_path = upload_root / "businesses" / ctx["business_id"] / "logo" / first_url.rsplit("/", 1)[-1]
    assert first_path.is_file()

    second = await async_client.post(
        _logo_path(ctx["business_id"]),
        headers=ctx["headers"],
        files={"file": ("logo2.png", io.BytesIO(_make_test_image_bytes("PNG")), "image/png")},
    )
    assert second.status_code == 200
    second_url = second.json()["logo_url"]
    assert second_url != first_url
    assert not first_path.is_file()

    profile = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
    )
    assert profile.json()["logo_url"] == second_url


@pytest.mark.asyncio
async def test_remove_business_logo_clears_logo_url(
    async_client: AsyncClient,
    db_session,
    upload_root,
) -> None:
    ctx = await _setup_active_business(async_client, db_session, "business-logo-remove")

    upload = await async_client.post(
        _logo_path(ctx["business_id"]),
        headers=ctx["headers"],
        files={"file": ("logo.jpg", io.BytesIO(_make_test_image_bytes()), "image/jpeg")},
    )
    assert upload.status_code == 200
    logo_url = upload.json()["logo_url"]
    logo_path = upload_root / "businesses" / ctx["business_id"] / "logo" / logo_url.rsplit("/", 1)[-1]
    assert logo_path.is_file()

    remove = await async_client.delete(_logo_path(ctx["business_id"]), headers=ctx["headers"])
    assert remove.status_code == 200
    assert remove.json()["removed"] is True
    assert not logo_path.is_file()

    profile = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
    )
    assert profile.status_code == 200
    assert profile.json()["logo_url"] is None


@pytest.mark.asyncio
async def test_upload_business_logo_rejects_invalid_type(
    async_client: AsyncClient,
    db_session,
    upload_root,
) -> None:
    ctx = await _setup_active_business(async_client, db_session, "business-logo-invalid-type")

    upload = await async_client.post(
        _logo_path(ctx["business_id"]),
        headers=ctx["headers"],
        files={"file": ("logo.gif", io.BytesIO(b"GIF89a"), "image/gif")},
    )
    assert upload.status_code == 400
