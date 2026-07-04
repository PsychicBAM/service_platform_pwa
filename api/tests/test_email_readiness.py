from __future__ import annotations

import importlib.util
import subprocess
import sys
from pathlib import Path
from unittest.mock import patch

import pytest
from pydantic import ValidationError

from app.config import Settings
from app.services.email_service import (
    EMAIL_CONFIG_INVALID,
    EMAIL_DISABLED,
    EMAIL_DRY_RUN,
    EMAIL_SEND_FAILED,
    EMAIL_SENT,
    EmailMessage,
    EmailService,
)


def _load_readiness_module():
    api_dir = Path(__file__).resolve().parents[1]
    script_path = api_dir / "scripts" / "check_email_readiness.py"
    spec = importlib.util.spec_from_file_location("check_email_readiness", script_path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


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
    base.update(overrides)
    return Settings(**base)


def test_default_local_config_does_not_send_email() -> None:
    service = EmailService(_settings(email_enabled=False))
    result = service.send_email(
        EmailMessage(to_email="guest@example.com", subject="Test", text_body="Hello")
    )
    assert result.sent is False
    assert result.dry_run is True
    assert result.message_code == EMAIL_DISABLED


def test_dry_run_mode_returns_safe_result() -> None:
    service = EmailService(_settings(email_enabled=True, email_dry_run=True))
    with patch("app.services.email_service.smtplib.SMTP") as smtp_mock:
        result = service.send_email(
            EmailMessage(to_email="guest@example.com", subject="Test", text_body="Hello")
        )
    assert result.sent is True
    assert result.dry_run is True
    assert result.message_code == EMAIL_DRY_RUN
    smtp_mock.assert_not_called()


def test_email_disabled_does_not_require_smtp_password() -> None:
    settings = _settings(email_enabled=False, smtp_password=None)
    assert settings.email_config_issue_codes() == []


def test_live_email_missing_smtp_fails_production_validation() -> None:
    with pytest.raises(ValidationError):
        Settings(
            app_env="production",
            email_enabled=True,
            email_dry_run=False,
            smtp_host=None,
            smtp_from_email=None,
            cors_origins="https://app.example.com",
            jwt_secret_key="x" * 32,
        )


def test_smtp_password_never_in_service_result() -> None:
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
    with patch.object(service, "_send_via_smtp", side_effect=RuntimeError("SMTP unavailable")):
        result = service.send_email(
            EmailMessage(to_email="guest@example.com", subject="Test", text_body="Hello")
        )

    assert result.message_code == EMAIL_SEND_FAILED
    assert secret not in result.message


def test_readiness_audit_output_never_includes_smtp_password(
    capsys: pytest.CaptureFixture[str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    secret = "super_secret_smtp_password_value"
    monkeypatch.setenv("EMAIL_ENABLED", "true")
    monkeypatch.setenv("EMAIL_DRY_RUN", "true")
    monkeypatch.setenv("SMTP_PASSWORD", secret)
    from app.config import get_settings

    get_settings.cache_clear()

    module = _load_readiness_module()
    exit_code = module.main([])
    captured = capsys.readouterr()

    get_settings.cache_clear()

    assert exit_code == 0
    assert secret not in captured.out
    assert "SMTP_PASSWORD=set" in captured.out


def test_check_email_readiness_exits_zero_in_safe_default_mode(
    capsys: pytest.CaptureFixture[str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("EMAIL_ENABLED", "false")
    monkeypatch.setenv("EMAIL_DRY_RUN", "true")
    from app.config import get_settings

    get_settings.cache_clear()

    module = _load_readiness_module()
    exit_code = module.main([])
    captured = capsys.readouterr()

    get_settings.cache_clear()

    assert exit_code == 0
    assert "EMAIL_ENABLED=False" in captured.out
    assert "EMAIL_DRY_RUN=True" in captured.out
    assert "Email readiness audit passed" in captured.out


def test_send_test_refused_when_email_disabled(capsys: pytest.CaptureFixture[str]) -> None:
    module = _load_readiness_module()
    settings = _settings(email_enabled=False, email_dry_run=True)

    with patch("app.config.Settings", return_value=settings):
        exit_code = module.run_audit(send_test_to="operator@example.com")

    captured = capsys.readouterr()
    assert exit_code == 1
    assert "refused" in captured.out.lower()
    assert "EMAIL_ENABLED=false" in captured.out


def test_send_test_refused_when_dry_run_enabled(capsys: pytest.CaptureFixture[str]) -> None:
    module = _load_readiness_module()
    settings = _settings(
        email_enabled=True,
        email_dry_run=True,
        smtp_host="smtp.example.com",
        smtp_from_email="noreply@example.com",
    )

    with patch("app.config.Settings", return_value=settings):
        exit_code = module.run_audit(send_test_to="operator@example.com")

    captured = capsys.readouterr()
    assert exit_code == 1
    assert "refused" in captured.out.lower()
    assert "EMAIL_DRY_RUN=true" in captured.out


def test_live_config_missing_smtp_reports_issue_codes() -> None:
    settings = _settings(
        email_enabled=True,
        email_dry_run=False,
        smtp_host=None,
        smtp_from_email=None,
    )
    assert settings.email_config_issue_codes() == [
        "SMTP_HOST_MISSING",
        "SMTP_FROM_EMAIL_MISSING",
    ]


def test_missing_smtp_config_returns_static_code() -> None:
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
            EmailMessage(to_email="guest@example.com", subject="Test", text_body="Hello")
        )
    assert result.message_code == EMAIL_CONFIG_INVALID
    smtp_mock.assert_not_called()


def test_live_send_success_code() -> None:
    service = EmailService(
        _settings(
            email_enabled=True,
            email_dry_run=False,
            smtp_host="smtp.example.com",
            smtp_from_email="noreply@example.com",
        )
    )
    with patch("app.services.email_service.smtplib.SMTP") as smtp_mock:
        smtp_instance = smtp_mock.return_value
        smtp_instance.__enter__.return_value = smtp_instance
        result = service.send_email(
            EmailMessage(to_email="guest@example.com", subject="Test", text_body="Hello")
        )
    assert result.message_code == EMAIL_SENT


def test_strict_mode_fails_on_incomplete_live_smtp(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setenv("EMAIL_ENABLED", "true")
    monkeypatch.setenv("EMAIL_DRY_RUN", "false")
    monkeypatch.setenv("SMTP_HOST", "")
    monkeypatch.setenv("SMTP_FROM_EMAIL", "")
    from app.config import get_settings

    get_settings.cache_clear()

    module = _load_readiness_module()
    exit_code = module.main(["--strict"])
    captured = capsys.readouterr()

    get_settings.cache_clear()

    assert exit_code == 1
    assert "SMTP_HOST_MISSING" in captured.out


def test_check_email_readiness_script_runs_via_subprocess() -> None:
    api_dir = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        [sys.executable, "scripts/check_email_readiness.py"],
        cwd=api_dir,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0
    assert "Email readiness audit passed" in result.stdout
    assert "super_secret" not in result.stdout.lower()
