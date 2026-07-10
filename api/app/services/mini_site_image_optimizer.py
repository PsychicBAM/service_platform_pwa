"""Optimize uploaded mini-site images to web-friendly WebP variants."""

from __future__ import annotations

import io
import uuid
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError

from app.exceptions.business import ValidationAppError
from app.services.mini_site_media_storage import (
    build_mini_site_image_public_url,
    resolve_mini_site_upload_path,
)

WEB_MAX_WIDTH = 1600
THUMB_MAX_WIDTH = 400
WEBP_QUALITY = 82


@dataclass(frozen=True)
class OptimizedMiniSiteImage:
    web_filename: str
    thumb_filename: str
    web_path: Path
    thumb_path: Path
    web_url: str
    thumbnail_url: str
    content_type: str
    size: int
    original_size: int
    width: int
    height: int


def optimize_mini_site_image(
    business_id: uuid.UUID,
    *,
    content: bytes,
    base_id: str | None = None,
) -> OptimizedMiniSiteImage:
    original_size = len(content)
    base = base_id or uuid.uuid4().hex
    web_filename = f"{base}.webp"
    thumb_filename = f"{base}_thumb.webp"
    web_path = resolve_mini_site_upload_path(business_id, web_filename)
    thumb_path = resolve_mini_site_upload_path(business_id, thumb_filename)

    try:
        with Image.open(io.BytesIO(content)) as source:
            prepared = _prepare_image(source)
            web_image = _resize_to_max_width(prepared, WEB_MAX_WIDTH)
            thumb_image = _resize_to_max_width(prepared, THUMB_MAX_WIDTH)
            width, height = web_image.size

            web_image.save(web_path, format="WEBP", quality=WEBP_QUALITY, method=4)
            thumb_image.save(thumb_path, format="WEBP", quality=WEBP_QUALITY, method=4)
    except UnidentifiedImageError as exc:
        _cleanup_paths(web_path, thumb_path)
        raise ValidationAppError("Only JPEG, PNG, and WebP images are allowed.") from exc
    except OSError as exc:
        _cleanup_paths(web_path, thumb_path)
        raise ValidationAppError("Could not process image file.") from exc

    return OptimizedMiniSiteImage(
        web_filename=web_filename,
        thumb_filename=thumb_filename,
        web_path=web_path,
        thumb_path=thumb_path,
        web_url=build_mini_site_image_public_url(business_id, web_filename),
        thumbnail_url=build_mini_site_image_public_url(business_id, thumb_filename),
        content_type="image/webp",
        size=web_path.stat().st_size,
        original_size=original_size,
        width=width,
        height=height,
    )


def _prepare_image(image: Image.Image) -> Image.Image:
    oriented = ImageOps.exif_transpose(image)
    if oriented.mode in ("RGBA", "LA"):
        return oriented
    if oriented.mode == "P" and "transparency" in oriented.info:
        return oriented.convert("RGBA")
    if oriented.mode != "RGB":
        return oriented.convert("RGB")
    return oriented


def _resize_to_max_width(image: Image.Image, max_width: int) -> Image.Image:
    width, height = image.size
    if width <= max_width:
        return image.copy()
    new_height = max(1, round(height * (max_width / width)))
    return image.resize((max_width, new_height), Image.Resampling.LANCZOS)


def _cleanup_paths(*paths: Path) -> None:
    for path in paths:
        if path.is_file():
            path.unlink()
