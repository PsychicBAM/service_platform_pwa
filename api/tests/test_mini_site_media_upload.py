"""Tests for mini-site image upload API."""

from __future__ import annotations

import io

import pytest
from httpx import AsyncClient
from PIL import Image
from sqlalchemy import select

from app.config import get_settings
from app.models.business import Business
from app.services.mini_site_media_storage import parse_mini_site_upload_url, resolve_mini_site_upload_path
from app.utils.mini_site_config import normalize_mini_site_config, read_mini_site_config_from_settings
from app.utils.mini_site_media_slots import (
    MINI_SITE_IMAGE_MAX_BYTES,
    MINI_SITE_IMAGE_MAX_SIZE_MESSAGE,
    MINI_SITE_IMAGE_MEDIA_SLOTS,
    is_allowed_mini_site_image_slot,
)
from app.models.enums import SubscriptionPlan, SubscriptionStatus
from app.repositories.business_repository import BusinessRepository
from tests.conftest import activate_business, register_and_get_context


def _make_test_image_bytes(
    image_format: str = "JPEG",
    size: tuple[int, int] = (800, 600),
) -> bytes:
    image = Image.new("RGB", size, color=(20, 120, 200))
    buffer = io.BytesIO()
    image.save(buffer, format=image_format)
    return buffer.getvalue()


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

async def _set_subscription_plan(db_session, business_id: str, plan: SubscriptionPlan) -> None:
    import uuid

    repo = BusinessRepository(db_session)
    subscription = await repo.get_subscription(uuid.UUID(business_id))
    assert subscription is not None
    await repo.update_subscription(
        subscription,
        {"plan": plan, "status": SubscriptionStatus.active},
    )
    await db_session.commit()
    db_session.expire_all()



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
    await _set_subscription_plan(db_session, ctx["business_id"], SubscriptionPlan.pro)

    response = await async_client.post(
        _upload_path(ctx["business_id"]),
        data={"template": "clinic", "slot": "heroImage"},
        files={"file": ("hero.jpg", io.BytesIO(_make_test_image_bytes()), "image/jpeg")},
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
    await _set_subscription_plan(db_session, ctx["business_id"], SubscriptionPlan.pro)

    response = await async_client.post(
        _upload_path(ctx["business_id"]),
        headers=ctx["headers"],
        data={"template": "clinic", "slot": "notARealSlot"},
        files={"file": ("hero.jpg", io.BytesIO(_make_test_image_bytes()), "image/jpeg")},
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
    await _set_subscription_plan(db_session, ctx["business_id"], SubscriptionPlan.pro)

    response = await async_client.post(
        _upload_path(ctx["business_id"]),
        headers=ctx["headers"],
        data={"template": "clinic", "slot": "heroImage"},
        files={"file": ("notes.txt", io.BytesIO(b"hello"), "text/plain")},
    )

    assert response.status_code == 400


@pytest.mark.asyncio
async def test_upload_creates_optimized_webp_with_thumbnail_metadata(
    async_client: AsyncClient,
    db_session,
    mini_site_upload_root,
) -> None:
    ctx = await register_and_get_context(async_client, "mini-site-media-upload-ok")
    await activate_business(db_session, ctx["slug"])
    await _set_subscription_plan(db_session, ctx["business_id"], SubscriptionPlan.pro)
    original_bytes = _make_test_image_bytes("PNG", (2000, 1200))

    response = await async_client.post(
        _upload_path(ctx["business_id"]),
        headers=ctx["headers"],
        data={"template": "clinic", "slot": "heroImage", "alt": "Clinic hero"},
        files={"file": ("hero.png", io.BytesIO(original_bytes), "image/png")},
    )

    assert response.status_code == 200
    body = response.json()
    media = body["media"]
    assert body["template"] == "clinic"
    assert body["slot"] == "heroImage"
    assert media["kind"] == "image"
    assert media["url"].startswith("/uploads/mini_site/")
    assert media["url"].endswith(".webp")
    assert media["thumbnail_url"].startswith("/uploads/mini_site/")
    assert media["thumbnail_url"].endswith("_thumb.webp")
    assert media["alt"] == "Clinic hero"
    assert media["content_type"] == "image/webp"
    assert media["original_size"] == len(original_bytes)
    assert media["width"] == 1600
    assert media["height"] == 960
    assert media["size"] > 0

    result = await db_session.execute(select(Business).where(Business.slug == ctx["slug"]))
    business = result.scalar_one()
    config = read_mini_site_config_from_settings(business.settings)
    stored = config.template_media["clinic"]["heroImage"]
    assert stored["url"] == media["url"]
    assert stored["thumbnail_url"] == media["thumbnail_url"]

    parsed = parse_mini_site_upload_url(media["url"])
    assert parsed is not None
    business_id, web_filename = parsed
    web_path = resolve_mini_site_upload_path(business_id, web_filename)
    thumb_path = resolve_mini_site_upload_path(business_id, web_filename.replace(".webp", "_thumb.webp"))
    assert web_path.is_file()
    assert thumb_path.is_file()


@pytest.mark.asyncio
async def test_remove_clears_slot_and_deletes_optimized_files(
    async_client: AsyncClient,
    db_session,
    mini_site_upload_root,
) -> None:
    ctx = await register_and_get_context(async_client, "mini-site-media-remove")
    await activate_business(db_session, ctx["slug"])
    await _set_subscription_plan(db_session, ctx["business_id"], SubscriptionPlan.pro)

    upload_response = await async_client.post(
        _upload_path(ctx["business_id"]),
        headers=ctx["headers"],
        data={"template": "portfolio", "slot": "heroVisual"},
        files={"file": ("hero.png", io.BytesIO(_make_test_image_bytes()), "image/png")},
    )
    assert upload_response.status_code == 200
    media = upload_response.json()["media"]
    parsed = parse_mini_site_upload_url(media["url"])
    assert parsed is not None
    business_id, web_filename = parsed
    web_path = resolve_mini_site_upload_path(business_id, web_filename)
    thumb_path = resolve_mini_site_upload_path(business_id, web_filename.replace(".webp", "_thumb.webp"))

    remove_response = await async_client.delete(
        _remove_path(ctx["business_id"], "portfolio", "heroVisual"),
        headers=ctx["headers"],
    )
    assert remove_response.status_code == 200

    result = await db_session.execute(select(Business).where(Business.slug == ctx["slug"]))
    business = result.scalar_one()
    config = read_mini_site_config_from_settings(business.settings)
    assert "portfolio" not in config.template_media or "heroVisual" not in config.template_media.get("portfolio", {})
    assert not web_path.is_file()
    assert not thumb_path.is_file()


@pytest.mark.asyncio
async def test_legacy_config_without_template_media_normalizes_safely(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "mini-site-media-legacy")
    await activate_business(db_session, ctx["slug"])
    await _set_subscription_plan(db_session, ctx["business_id"], SubscriptionPlan.pro)

    response = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}/mini-site-config",
        headers=ctx["headers"],
    )

    assert response.status_code == 200
    body = response.json()
    assert body["template_media"] == {}


def test_mini_site_image_max_bytes_is_twelve_mb() -> None:
    assert MINI_SITE_IMAGE_MAX_BYTES == 12 * 1024 * 1024


def test_mini_site_slot_allowlist_includes_service_and_booking_slots() -> None:
    assert is_allowed_mini_site_image_slot("clinic", "servicesImage")
    assert is_allowed_mini_site_image_slot("clinic", "appointmentImage")
    assert is_allowed_mini_site_image_slot("service", "requestImage")
    assert is_allowed_mini_site_image_slot("portfolio", "collaborationImage")
    assert is_allowed_mini_site_image_slot("clean", "ctaImage")
    assert "servicesImage" in MINI_SITE_IMAGE_MEDIA_SLOTS["teacher"]


def test_expert_item_image_slots_are_allowed_and_validated() -> None:
    assert is_allowed_mini_site_image_slot("expert", "articleCover__article-abc123")
    assert is_allowed_mini_site_image_slot("expert", "workCover__work_1")
    assert is_allowed_mini_site_image_slot("expert", "testimonialAvatar__t1")
    assert is_allowed_mini_site_image_slot("expert", "profileImage")
    assert is_allowed_mini_site_image_slot("expert", "heroImage")
    assert not is_allowed_mini_site_image_slot("expert", "articleCover__")
    assert not is_allowed_mini_site_image_slot("expert", "articleCover__bad slot!")
    assert not is_allowed_mini_site_image_slot("expert", "randomSlot")
    assert not is_allowed_mini_site_image_slot("service", "articleCover__article1")
    assert not is_allowed_mini_site_image_slot("clean", "workCover__work1")


def test_normalize_legacy_media_without_thumbnail_url() -> None:
    config = normalize_mini_site_config(
        {
            "template_media": {
                "clinic": {
                    "heroImage": {
                        "kind": "image",
                        "url": "/uploads/mini_site/1/legacy.webp",
                        "alt": "Legacy",
                    }
                }
            }
        }
    )
    media = config.template_media["clinic"]["heroImage"]
    assert media["url"] == "/uploads/mini_site/1/legacy.webp"
    assert media["thumbnail_url"] == ""
    assert media["original_size"] == 0


@pytest.mark.asyncio
async def test_upload_rejects_oversized_image_with_clear_message(
    async_client: AsyncClient,
    db_session,
    mini_site_upload_root,
) -> None:
    ctx = await register_and_get_context(async_client, "mini-site-media-oversized")
    await activate_business(db_session, ctx["slug"])
    await _set_subscription_plan(db_session, ctx["business_id"], SubscriptionPlan.pro)

    oversized = b"x" * (MINI_SITE_IMAGE_MAX_BYTES + 1)
    response = await async_client.post(
        _upload_path(ctx["business_id"]),
        headers=ctx["headers"],
        data={"template": "clinic", "slot": "heroImage"},
        files={"file": ("big.jpg", io.BytesIO(oversized), "image/jpeg")},
    )

    assert response.status_code == 400
    assert MINI_SITE_IMAGE_MAX_SIZE_MESSAGE in response.json()["error"]["message"]


@pytest.mark.asyncio
async def test_upload_rejects_invalid_image_bytes(
    async_client: AsyncClient,
    db_session,
    mini_site_upload_root,
) -> None:
    ctx = await register_and_get_context(async_client, "mini-site-media-invalid-bytes")
    await activate_business(db_session, ctx["slug"])
    await _set_subscription_plan(db_session, ctx["business_id"], SubscriptionPlan.pro)

    response = await async_client.post(
        _upload_path(ctx["business_id"]),
        headers=ctx["headers"],
        data={"template": "clinic", "slot": "heroImage"},
        files={"file": ("hero.jpg", io.BytesIO(b"not-a-real-image"), "image/jpeg")},
    )

    assert response.status_code == 400


@pytest.mark.asyncio
async def test_upload_accepts_jpeg_and_png_under_limit_and_optimizes_to_webp(
    async_client: AsyncClient,
    db_session,
    mini_site_upload_root,
) -> None:
    ctx = await register_and_get_context(async_client, "mini-site-media-jpeg-png")
    await activate_business(db_session, ctx["slug"])
    await _set_subscription_plan(db_session, ctx["business_id"], SubscriptionPlan.pro)

    for filename, content_type, image_format in (
        ("photo.jpg", "image/jpeg", "JPEG"),
        ("photo.png", "image/png", "PNG"),
    ):
        response = await async_client.post(
            _upload_path(ctx["business_id"]),
            headers=ctx["headers"],
            data={"template": "clinic", "slot": "servicesImage"},
            files={
                "file": (
                    filename,
                    io.BytesIO(_make_test_image_bytes(image_format)),
                    content_type,
                )
            },
        )
        assert response.status_code == 200
        media = response.json()["media"]
        assert media["content_type"] == "image/webp"
        assert media["thumbnail_url"].endswith("_thumb.webp")
