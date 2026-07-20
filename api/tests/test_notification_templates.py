"""Tests for per-business notification email templates."""

from __future__ import annotations

import pytest

from app.schemas.business import BusinessSettingsRead, BusinessSettingsUpdate
from app.services.email_templates import build_client_review_request_email
from app.utils.notification_templates import (
    normalize_notification_templates_patch,
    render_template,
    resolve_notification_templates,
)


def test_default_templates_include_review_request() -> None:
    templates = resolve_notification_templates({})
    assert "review_request" in templates
    assert "{business_name}" in templates["review_request"]["subject"]
    assert "{review_link}" in templates["review_request"]["body"]


def test_settings_read_exposes_notification_templates() -> None:
    settings = BusinessSettingsRead.from_settings(
        {
            "notification_templates": {
                "review_request": {
                    "subject": "Please review {business_name}",
                    "body": "Hi {client_name}. Link: {review_link}",
                    "enabled": True,
                }
            }
        }
    )
    assert settings.notification_templates["review_request"]["subject"] == (
        "Please review {business_name}"
    )


def test_settings_update_rejects_unknown_variables() -> None:
    with pytest.raises(ValueError, match="Unknown template variables"):
        BusinessSettingsUpdate(
            notification_templates={
                "review_request": {
                    "subject": "Hello {evil}",
                    "body": "Body",
                    "enabled": True,
                }
            }
        )


def test_normalize_accepts_valid_review_request_template() -> None:
    normalized = normalize_notification_templates_patch(
        {
            "review_request": {
                "subject": "Thanks {client_name}",
                "body": "Review {business_name}: {review_link}",
                "enabled": True,
            }
        }
    )
    assert normalized is not None
    assert normalized["review_request"]["subject"] == "Thanks {client_name}"


def test_custom_review_request_email_uses_template() -> None:
    message = build_client_review_request_email(
        to_email="client@example.com",
        recipient_name="Alex",
        business_name="Demo Salon",
        reference="BKG-1",
        review_url="https://example.com/r/token",
        expire_days=7,
        service_name="Haircut",
        target_type="booking",
        custom_subject="Review {business_name}",
        custom_body="Hi {client_name}, please review {service_name}: {review_link}",
    )
    assert message.subject == "Review Demo Salon"
    assert "Hi Alex" in message.text_body
    assert "Haircut" in message.text_body
    assert "https://example.com/r/token" in message.text_body
    assert "password" not in message.text_body.lower()


def test_render_template_leaves_unknown_placeholders() -> None:
    assert render_template("Hello {missing}", {"client_name": "Alex"}) == "Hello {missing}"
