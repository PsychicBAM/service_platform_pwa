"""Safe YouTube/Vimeo URL parsing for mini-site template video slots."""

from __future__ import annotations

import re
from typing import Any, Literal
from urllib.parse import parse_qs, urlparse

MiniSiteVideoProvider = Literal["youtube", "vimeo"]

_ALLOWED_EMBED_HOSTS = frozenset({"www.youtube.com", "youtube.com", "player.vimeo.com"})


def _sanitize_text(value: object) -> str:
    if not isinstance(value, str):
        return ""
    return value.replace("<", "").replace(">", "").strip()


def parse_mini_site_video_url(input_value: str) -> dict[str, str] | None:
    raw = _sanitize_text(input_value)
    if not raw:
        return None

    try:
        parsed = urlparse(raw)
    except ValueError:
        return None

    if parsed.scheme not in {"http", "https"}:
        return None

    host = (parsed.hostname or "").lower()
    path = parsed.path or ""

    if host in {"www.youtube.com", "youtube.com"}:
        if path.startswith("/embed/"):
            video_id = path.removeprefix("/embed/").split("/")[0].split("?")[0]
            if video_id:
                return _video_result("youtube", raw, f"https://www.youtube.com/embed/{video_id}")
        if path == "/watch" or path.startswith("/watch/"):
            query = parse_qs(parsed.query)
            video_ids = query.get("v")
            if video_ids and video_ids[0]:
                video_id = video_ids[0].split("&")[0]
                if video_id:
                    return _video_result("youtube", raw, f"https://www.youtube.com/embed/{video_id}")

    if host == "youtu.be":
        video_id = path.strip("/").split("/")[0].split("?")[0]
        if video_id:
            return _video_result("youtube", raw, f"https://www.youtube.com/embed/{video_id}")

    if host in {"www.vimeo.com", "vimeo.com"}:
        match = re.match(r"^/(\d+)", path)
        if match:
            video_id = match.group(1)
            return _video_result("vimeo", raw, f"https://player.vimeo.com/video/{video_id}")

    return None


def _video_result(provider: MiniSiteVideoProvider, url: str, embed_url: str) -> dict[str, str]:
    return {
        "provider": provider,
        "url": url,
        "embed_url": embed_url,
    }


def is_allowed_mini_site_video_embed_url(embed_url: str) -> bool:
    try:
        parsed = urlparse(embed_url)
    except ValueError:
        return False
    if parsed.scheme != "https":
        return False
    host = (parsed.hostname or "").lower()
    if host not in _ALLOWED_EMBED_HOSTS:
        return False
    if host in {"www.youtube.com", "youtube.com"}:
        return parsed.path.startswith("/embed/")
    if host == "player.vimeo.com":
        return parsed.path.startswith("/video/")
    return False


def normalize_video_media_value(value: object) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None

    kind = value.get("kind")
    if kind is not None and kind != "video":
        return None

    url_raw = value.get("url")
    if not isinstance(url_raw, str):
        return None
    url = _sanitize_text(url_raw)
    if not url:
        return None

    parsed = parse_mini_site_video_url(url)
    if parsed is None:
        embed_raw = value.get("embed_url", value.get("embedUrl"))
        provider_raw = value.get("provider")
        if (
            isinstance(embed_raw, str)
            and isinstance(provider_raw, str)
            and provider_raw in {"youtube", "vimeo"}
            and is_allowed_mini_site_video_embed_url(_sanitize_text(embed_raw))
        ):
            return {
                "kind": "video",
                "url": url,
                "provider": provider_raw,
                "embed_url": _sanitize_text(embed_raw),
                "title": _sanitize_text(value.get("title")) or "",
            }
        return None

    return {
        "kind": "video",
        "url": parsed["url"],
        "provider": parsed["provider"],
        "embed_url": parsed["embed_url"],
        "title": _sanitize_text(value.get("title")) or "",
    }
