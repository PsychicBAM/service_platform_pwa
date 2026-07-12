"""Local disk storage for per-service uploaded images."""

from __future__ import annotations

import re
import uuid
from pathlib import Path

from app.config import get_settings
from app.exceptions.business import ValidationAppError
from app.utils.mini_site_media_slots import ALLOWED_IMAGE_CONTENT_TYPES

_UPLOAD_URL_PREFIX = "/uploads/services"
_FILENAME_SANITIZE_RE = re.compile(r"[^a-zA-Z0-9._-]+")


def sanitize_original_filename(filename: str) -> str:
    base = Path(filename).name
    sanitized = _FILENAME_SANITIZE_RE.sub("_", base).strip("._")
    return sanitized[:120] if sanitized else "upload"


def service_upload_root() -> Path:
    settings = get_settings()
    root = Path(settings.mini_site_upload_root).resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root


def service_upload_dir(business_id: uuid.UUID, service_id: uuid.UUID) -> Path:
    directory = service_upload_root() / "services" / str(business_id) / str(service_id)
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def build_service_image_public_url(
    business_id: uuid.UUID,
    service_id: uuid.UUID,
    stored_filename: str,
) -> str:
    return f"{_UPLOAD_URL_PREFIX}/{business_id}/{service_id}/{stored_filename}"


def resolve_service_upload_path(
    business_id: uuid.UUID,
    service_id: uuid.UUID,
    stored_filename: str,
) -> Path:
    if stored_filename != Path(stored_filename).name or ".." in stored_filename:
        raise ValidationAppError("Invalid upload filename.")
    root = service_upload_root()
    path = (root / "services" / str(business_id) / str(service_id) / stored_filename).resolve()
    allowed_prefix = (root / "services" / str(business_id) / str(service_id)).resolve()
    if not str(path).startswith(str(allowed_prefix)):
        raise ValidationAppError("Invalid upload path.")
    return path


def parse_service_upload_url(url: str) -> tuple[uuid.UUID, uuid.UUID, str] | None:
    if not url.startswith(f"{_UPLOAD_URL_PREFIX}/"):
        return None
    parts = url.removeprefix(f"{_UPLOAD_URL_PREFIX}/").split("/", 2)
    if len(parts) != 3 or not parts[2] or "/" in parts[2]:
        return None
    try:
        business_id = uuid.UUID(parts[0])
        service_id = uuid.UUID(parts[1])
    except ValueError:
        return None
    return business_id, service_id, parts[2]


def extension_for_content_type(content_type: str) -> str:
    extension = ALLOWED_IMAGE_CONTENT_TYPES.get(content_type)
    if extension is None:
        raise ValidationAppError("Only JPEG, PNG, and WebP images are allowed.")
    return extension


def delete_service_upload_file_if_owned(
    business_id: uuid.UUID,
    service_id: uuid.UUID,
    url: str | None,
) -> None:
    if not url:
        return
    parsed = parse_service_upload_url(url)
    if parsed is None:
        return
    file_business_id, file_service_id, filename = parsed
    if file_business_id != business_id or file_service_id != service_id:
        return
    path = resolve_service_upload_path(business_id, service_id, filename)
    if path.is_file():
        path.unlink()


def delete_service_image_files_if_owned(
    business_id: uuid.UUID,
    service_id: uuid.UUID,
    image: object | None,
) -> None:
    if not isinstance(image, dict):
        return
    seen: set[str] = set()
    for key in ("url", "thumbnail_url", "thumbnailUrl"):
        url = image.get(key)
        if isinstance(url, str) and url and url not in seen:
            seen.add(url)
            delete_service_upload_file_if_owned(business_id, service_id, url)
