"""Unit tests for mini-site image optimization."""

from __future__ import annotations

import io
import uuid

from PIL import Image

from app.services.mini_site_image_optimizer import (
    THUMB_MAX_WIDTH,
    WEB_MAX_WIDTH,
    optimize_mini_site_image,
)
from app.services.mini_site_media_storage import mini_site_business_upload_dir


def _make_test_image_bytes(size: tuple[int, int] = (2400, 1350)) -> bytes:
    image = Image.new("RGB", size, color=(30, 90, 180))
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG")
    return buffer.getvalue()


def test_optimize_mini_site_image_creates_web_and_thumb_webp(tmp_path, monkeypatch) -> None:
    upload_root = tmp_path / "uploads"
    upload_root.mkdir()
    monkeypatch.setenv("MINI_SITE_UPLOAD_ROOT", str(upload_root))

    from app.config import get_settings

    get_settings.cache_clear()
    business_id = uuid.uuid4()
    mini_site_business_upload_dir(business_id)

    optimized = optimize_mini_site_image(business_id, content=_make_test_image_bytes())

    assert optimized.content_type == "image/webp"
    assert optimized.width == WEB_MAX_WIDTH
    assert optimized.height == 900
    assert optimized.web_url.endswith(".webp")
    assert optimized.thumbnail_url.endswith("_thumb.webp")
    assert optimized.size > 0
    assert optimized.original_size > optimized.size
    assert optimized.web_path.is_file()
    assert optimized.thumb_path.is_file()

    with Image.open(optimized.thumb_path) as thumb:
        assert thumb.size[0] == THUMB_MAX_WIDTH

    get_settings.cache_clear()
