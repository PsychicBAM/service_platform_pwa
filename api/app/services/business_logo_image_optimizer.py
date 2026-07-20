"""Optimize uploaded business logo images to square WebP avatars."""

from __future__ import annotations

import io
import uuid
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError

from app.exceptions.business import ValidationAppError
from app.services.business_logo_image_storage import (
    build_business_logo_public_url,
    resolve_business_logo_upload_path,
)

LOGO_MAX_SIZE = 512
WEBP_QUALITY = 82


@dataclass(frozen=True)
class OptimizedBusinessLogoImage:
    filename: str
    path: Path
    url: str
    content_type: str
    size: int
    original_size: int
    width: int
    height: int


def optimize_business_logo_image(
    business_id: uuid.UUID,
    *,
    content: bytes,
    base_id: str | None = None,
) -> OptimizedBusinessLogoImage:
    original_size = len(content)
    base = base_id or uuid.uuid4().hex
    filename = f"{base}.webp"
    path = resolve_business_logo_upload_path(business_id, filename)

    try:
        with Image.open(io.BytesIO(content)) as source:
            prepared = _prepare_image(source)
            square = ImageOps.fit(
                prepared,
                (LOGO_MAX_SIZE, LOGO_MAX_SIZE),
                method=Image.Resampling.LANCZOS,
                centering=(0.5, 0.5),
            )
            if square.mode in ("RGBA", "LA"):
                rgba = square.convert("RGBA")
                background = Image.new("RGB", rgba.size, (255, 255, 255))
                background.paste(rgba, mask=rgba.split()[3])
                square = background
            elif square.mode != "RGB":
                square = square.convert("RGB")

            width, height = square.size
            square.save(path, format="WEBP", quality=WEBP_QUALITY, method=4)
    except UnidentifiedImageError as exc:
        _cleanup_paths(path)
        raise ValidationAppError("Only JPEG, PNG, and WebP images are allowed.") from exc
    except OSError as exc:
        _cleanup_paths(path)
        raise ValidationAppError("Could not process image file.") from exc

    return OptimizedBusinessLogoImage(
        filename=filename,
        path=path,
        url=build_business_logo_public_url(business_id, filename),
        content_type="image/webp",
        size=path.stat().st_size,
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


def _cleanup_paths(*paths: Path) -> None:
    for path in paths:
        if path.is_file():
            path.unlink()
