"""Tests for mini-site template video URL normalization."""

from app.utils.mini_site_config import default_mini_site_config, normalize_mini_site_config
from app.utils.mini_site_video import (
    is_allowed_mini_site_video_embed_url,
    normalize_video_media_value,
    parse_mini_site_video_url,
)


def test_parse_youtube_watch_url() -> None:
    parsed = parse_mini_site_video_url("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    assert parsed is not None
    assert parsed["provider"] == "youtube"
    assert parsed["embed_url"] == "https://www.youtube.com/embed/dQw4w9WgXcQ"


def test_parse_vimeo_url() -> None:
    parsed = parse_mini_site_video_url("https://vimeo.com/123456789")
    assert parsed is not None
    assert parsed["provider"] == "vimeo"
    assert parsed["embed_url"] == "https://player.vimeo.com/video/123456789"


def test_normalize_video_media_value_from_url() -> None:
    normalized = normalize_video_media_value(
        {
            "kind": "video",
            "url": "https://youtu.be/abc123XYZ12",
            "title": "Intro",
        },
    )
    assert normalized is not None
    assert normalized["kind"] == "video"
    assert normalized["provider"] == "youtube"
    assert normalized["embed_url"] == "https://www.youtube.com/embed/abc123XYZ12"
    assert normalized["title"] == "Intro"


def test_invalid_video_media_returns_none() -> None:
    assert normalize_video_media_value({"kind": "video", "url": "https://example.com/video"}) is None


def test_malicious_supplied_embed_url_is_ignored_for_valid_youtube_url() -> None:
    normalized = normalize_video_media_value(
        {
            "kind": "video",
            "url": "https://youtube.com/watch?v=1",
            "provider": "youtube",
            "embed_url": "https://evil.com/embed/1",
        },
    )
    assert normalized is not None
    assert normalized["provider"] == "youtube"
    assert normalized["embed_url"] == "https://www.youtube.com/embed/1"
    assert "evil.com" not in normalized["embed_url"]


def test_allowed_embed_url_host_check() -> None:
    assert is_allowed_mini_site_video_embed_url("https://www.youtube.com/embed/abc") is True
    assert is_allowed_mini_site_video_embed_url("https://player.vimeo.com/video/123") is True
    assert is_allowed_mini_site_video_embed_url("https://evil.com/embed/abc") is False


def test_normalize_config_preserves_valid_video_media() -> None:
    base = default_mini_site_config()
    config = normalize_mini_site_config(
        {
            "version": 1,
            "theme": base.theme.model_dump(),
            "sections": [section.model_dump() for section in base.sections],
            "social_links": {},
            "template_media": {
                "clinic": {
                    "intro_video": {
                        "kind": "video",
                        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                    },
                    "hero_image": "https://example.com/clinic.jpg",
                },
            },
        },
    )
    intro = config.template_media["clinic"]["intro_video"]
    assert intro["kind"] == "video"
    assert intro["provider"] == "youtube"
    assert intro["embed_url"] == "https://www.youtube.com/embed/dQw4w9WgXcQ"

    hero = config.template_media["clinic"]["hero_image"]
    assert hero["kind"] == "image"
    assert hero["url"] == "https://example.com/clinic.jpg"


def test_legacy_config_without_video_media_still_works() -> None:
    base = default_mini_site_config()
    config = normalize_mini_site_config(
        {
            "version": 1,
            "theme": base.theme.model_dump(),
            "sections": [section.model_dump() for section in base.sections],
            "social_links": {},
            "template_media": {
                "clinic": {
                    "hero_image": {
                        "kind": "image",
                        "url": "/uploads/mini_site/1/abc.webp",
                        "content_type": "image/webp",
                        "size": 1200,
                    },
                },
            },
        },
    )
    assert "intro_video" not in config.template_media["clinic"]
    assert config.template_media["clinic"]["hero_image"]["kind"] == "image"
