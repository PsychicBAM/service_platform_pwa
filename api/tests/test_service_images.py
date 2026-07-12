"""Tests for per-service image upload API."""

from __future__ import annotations

import io

import pytest
from httpx import AsyncClient
from PIL import Image
from sqlalchemy import select

from app.config import get_settings
from app.models.service import Service
from app.services.service_image_storage import parse_service_upload_url, resolve_service_upload_path
from app.utils.mini_site_media_slots import MINI_SITE_IMAGE_MAX_BYTES, MINI_SITE_IMAGE_MAX_SIZE_MESSAGE
from tests.conftest import BOOKING_SERVICE_PAYLOAD, register_and_get_context


def _make_test_image_bytes(
    image_format: str = "JPEG",
    size: tuple[int, int] = (800, 600),
) -> bytes:
    image = Image.new("RGB", size, color=(20, 120, 200))
    buffer = io.BytesIO()
    image.save(buffer, format=image_format)
    return buffer.getvalue()


@pytest.fixture
def service_upload_root(tmp_path, monkeypatch: pytest.MonkeyPatch):
    upload_root = tmp_path / "uploads"
    upload_root.mkdir()
    monkeypatch.setenv("MINI_SITE_UPLOAD_ROOT", str(upload_root))
    get_settings.cache_clear()
    yield upload_root
    get_settings.cache_clear()


def _services_path(business_id: str) -> str:
    return f"/api/v1/businesses/{business_id}/services"


def _image_path(business_id: str, service_id: str) -> str:
    return f"/api/v1/businesses/{business_id}/services/{service_id}/image"


async def _create_service(async_client: AsyncClient, ctx: dict) -> str:
    response = await async_client.post(
        _services_path(ctx["business_id"]),
        json=BOOKING_SERVICE_PAYLOAD,
        headers=ctx["headers"],
    )
    assert response.status_code == 201
    return response.json()["id"]


@pytest.mark.asyncio
async def test_upload_valid_service_image(
    async_client: AsyncClient,
    db_session,
    service_upload_root,
) -> None:
    ctx = await register_and_get_context(async_client, "service-image-upload-ok")
    service_id = await _create_service(async_client, ctx)
    original_bytes = _make_test_image_bytes("PNG", (1800, 900))

    response = await async_client.post(
        _image_path(ctx["business_id"], service_id),
        headers=ctx["headers"],
        files={"file": ("service.png", io.BytesIO(original_bytes), "image/png")},
    )

    assert response.status_code == 200
    body = response.json()
    image = body["image"]
    assert body["service_id"] == service_id
    assert image["kind"] == "image"
    assert image["url"].startswith(f"/uploads/services/{ctx['business_id']}/{service_id}/")
    assert image["thumbnail_url"].startswith(f"/uploads/services/{ctx['business_id']}/{service_id}/")
    assert image["url"].endswith(".webp")
    assert image["thumbnail_url"].endswith("_thumb.webp")
    assert "/api/v1/uploads/" not in image["url"]
    assert image["content_type"] == "image/webp"
    assert image["original_size"] == len(original_bytes)
    assert image["width"] == 1600

    list_response = await async_client.get(
        _services_path(ctx["business_id"]),
        headers=ctx["headers"],
    )
    assert list_response.status_code == 200
    listed = list_response.json()["data"][0]
    assert listed["image"]["url"] == image["url"]

    result = await db_session.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one()
    assert service.image_["url"] == image["url"]


@pytest.mark.asyncio
async def test_upload_rejects_invalid_type(
    async_client: AsyncClient,
    service_upload_root,
) -> None:
    ctx = await register_and_get_context(async_client, "service-image-invalid-type")
    service_id = await _create_service(async_client, ctx)

    response = await async_client.post(
        _image_path(ctx["business_id"], service_id),
        headers=ctx["headers"],
        files={"file": ("notes.txt", io.BytesIO(b"hello"), "text/plain")},
    )

    assert response.status_code == 400


@pytest.mark.asyncio
async def test_upload_rejects_oversized_file(
    async_client: AsyncClient,
    service_upload_root,
) -> None:
    ctx = await register_and_get_context(async_client, "service-image-too-large")
    service_id = await _create_service(async_client, ctx)
    oversized = b"x" * (MINI_SITE_IMAGE_MAX_BYTES + 1)

    response = await async_client.post(
        _image_path(ctx["business_id"], service_id),
        headers=ctx["headers"],
        files={"file": ("large.jpg", io.BytesIO(oversized), "image/jpeg")},
    )

    assert response.status_code == 400
    assert response.json()["error"]["message"] == MINI_SITE_IMAGE_MAX_SIZE_MESSAGE


@pytest.mark.asyncio
async def test_remove_image_clears_metadata(
    async_client: AsyncClient,
    db_session,
    service_upload_root,
) -> None:
    ctx = await register_and_get_context(async_client, "service-image-remove")
    service_id = await _create_service(async_client, ctx)

    upload_response = await async_client.post(
        _image_path(ctx["business_id"], service_id),
        headers=ctx["headers"],
        files={"file": ("service.jpg", io.BytesIO(_make_test_image_bytes()), "image/jpeg")},
    )
    assert upload_response.status_code == 200
    image_url = upload_response.json()["image"]["url"]

    remove_response = await async_client.delete(
        _image_path(ctx["business_id"], service_id),
        headers=ctx["headers"],
    )
    assert remove_response.status_code == 200
    assert remove_response.json()["removed"] is True

    get_response = await async_client.get(
        f"{_services_path(ctx['business_id'])}/{service_id}",
        headers=ctx["headers"],
    )
    assert get_response.status_code == 200
    assert get_response.json()["image"] is None

    result = await db_session.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one()
    assert service.image_ is None

    parsed = parse_service_upload_url(image_url)
    assert parsed is not None
    business_id, svc_id, filename = parsed
    path = resolve_service_upload_path(business_id, svc_id, filename)
    assert not path.is_file()


@pytest.mark.asyncio
async def test_replace_image_updates_metadata(
    async_client: AsyncClient,
    db_session,
    service_upload_root,
) -> None:
    ctx = await register_and_get_context(async_client, "service-image-replace")
    service_id = await _create_service(async_client, ctx)

    first = await async_client.post(
        _image_path(ctx["business_id"], service_id),
        headers=ctx["headers"],
        files={"file": ("first.jpg", io.BytesIO(_make_test_image_bytes()), "image/jpeg")},
    )
    assert first.status_code == 200
    first_url = first.json()["image"]["url"]

    second = await async_client.post(
        _image_path(ctx["business_id"], service_id),
        headers=ctx["headers"],
        files={"file": ("second.png", io.BytesIO(_make_test_image_bytes("PNG")), "image/png")},
    )
    assert second.status_code == 200
    second_url = second.json()["image"]["url"]
    assert second_url != first_url
    assert second.json()["image"]["filename"] == "second.png"

    parsed = parse_service_upload_url(first_url)
    assert parsed is not None
    business_id, svc_id, filename = parsed
    path = resolve_service_upload_path(business_id, svc_id, filename)
    assert not path.is_file()


@pytest.mark.asyncio
async def test_wrong_business_cannot_modify_service_image(
    async_client: AsyncClient,
    service_upload_root,
) -> None:
    owner_ctx = await register_and_get_context(async_client, "service-image-owner")
    other_ctx = await register_and_get_context(async_client, "service-image-other")
    service_id = await _create_service(async_client, owner_ctx)

    response = await async_client.post(
        _image_path(owner_ctx["business_id"], service_id),
        headers=other_ctx["headers"],
        files={"file": ("service.jpg", io.BytesIO(_make_test_image_bytes()), "image/jpeg")},
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_public_service_payload_includes_image_metadata(
    async_client: AsyncClient,
    db_session,
    service_upload_root,
) -> None:
    ctx = await register_and_get_context(async_client, "service-image-public")
    service_id = await _create_service(async_client, ctx)

    upload_response = await async_client.post(
        _image_path(ctx["business_id"], service_id),
        headers=ctx["headers"],
        files={"file": ("service.jpg", io.BytesIO(_make_test_image_bytes()), "image/jpeg")},
    )
    assert upload_response.status_code == 200
    image_url = upload_response.json()["image"]["url"]

    from tests.conftest import activate_business

    await activate_business(db_session, ctx["slug"])

    public_response = await async_client.get(f"/api/v1/public/b/{ctx['slug']}/services")
    assert public_response.status_code == 200
    public_services = public_response.json()
    assert len(public_services) == 1
    assert public_services[0]["image"]["url"] == image_url
