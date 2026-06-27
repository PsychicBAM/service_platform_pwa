from __future__ import annotations

import logging
from unittest.mock import MagicMock, patch

import pytest

from app.config import Settings
from app.services.email_service import EmailMessage, EmailService


def _settings(**overrides) -> Settings:
    base = {
        "email_enabled": False,
        "email_dry_run": True,
        "smtp_host": None,
        "smtp_port": 587,
        "smtp_user": None,
        "smtp_password": None,
        "smtp_from_email": None,
        "smtp_from_name": "Service Platform",
        "smtp_use_tls": True,
    }
    base.update(overrides)
    return Settings(**base)


def test_email_disabled_returns_disabled_dry_run_result() -> None:
    service = EmailService(_settings(email_enabled=False))
    result = service.send_email(
        EmailMessage(
            to_email="guest@example.com",
            subject="Test",
            text_body="Hello",
        )
    )
    assert result.sent is False
    assert result.dry_run is True
    assert result.message == "Email disabled"


def test_email_dry_run_returns_success_without_smtp(
    caplog: pytest.LogCaptureFixture,
) -> None:
    service = EmailService(_settings(email_enabled=True, email_dry_run=True))
    with caplog.at_level(logging.INFO):
        result = service.send_email(
            EmailMessage(
                to_email="guest@example.com",
                subject="Booking confirmed",
                text_body="Your booking is confirmed.",
            )
        )

    assert result.sent is True
    assert result.dry_run is True
    assert "not sent" in result.message.lower()
    assert "guest@example.com" in caplog.text
    assert "Booking confirmed" in caplog.text


def test_email_dry_run_does_not_call_smtp() -> None:
    service = EmailService(_settings(email_enabled=True, email_dry_run=True))
    with patch("app.services.email_service.smtplib.SMTP") as smtp_mock:
        result = service.send_email(
            EmailMessage(
                to_email="guest@example.com",
                subject="Test",
                text_body="Hello",
            )
        )

    assert result.sent is True
    smtp_mock.assert_not_called()


def test_smtp_password_not_in_logs_or_result(
    caplog: pytest.LogCaptureFixture,
) -> None:
    secret = "super_secret_smtp_password_value"
    service = EmailService(
        _settings(
            email_enabled=True,
            email_dry_run=False,
            smtp_host="smtp.example.com",
            smtp_from_email="noreply@example.com",
            smtp_user="mailer",
            smtp_password=secret,
        )
    )
    with caplog.at_level(logging.DEBUG):
        with patch.object(service, "_send_via_smtp") as send_mock:
            send_mock.side_effect = RuntimeError("SMTP unavailable")
            result = service.send_email(
                EmailMessage(
                    to_email="guest@example.com",
                    subject="Test",
                    text_body="Hello",
                )
            )

    assert result.sent is False
    assert secret not in result.message
    assert secret not in caplog.text


def test_missing_smtp_config_fails_safely_when_live_send_enabled() -> None:
    service = EmailService(
        _settings(
            email_enabled=True,
            email_dry_run=False,
            smtp_host=None,
            smtp_from_email=None,
        )
    )
    with patch("app.services.email_service.smtplib.SMTP") as smtp_mock:
        result = service.send_email(
            EmailMessage(
                to_email="guest@example.com",
                subject="Test",
                text_body="Hello",
            )
        )

    assert result.sent is False
    assert result.dry_run is False
    assert "SMTP_HOST" in result.message
    smtp_mock.assert_not_called()


def test_live_send_uses_smtp_when_configured() -> None:
    service = EmailService(
        _settings(
            email_enabled=True,
            email_dry_run=False,
            smtp_host="smtp.example.com",
            smtp_from_email="noreply@example.com",
            smtp_user="mailer",
            smtp_password="secret",
        )
    )
    smtp_instance = MagicMock()
    with patch("app.services.email_service.smtplib.SMTP", return_value=smtp_instance) as smtp_mock:
        smtp_instance.__enter__.return_value = smtp_instance
        result = service.send_email(
            EmailMessage(
                to_email="guest@example.com",
                subject="Test",
                text_body="Hello",
            )
        )

    assert result.sent is True
    assert result.dry_run is False
    smtp_mock.assert_called_once_with("smtp.example.com", 587, timeout=30)
    smtp_instance.starttls.assert_called_once()
    smtp_instance.login.assert_called_once_with("mailer", "secret")
    smtp_instance.send_message.assert_called_once()
