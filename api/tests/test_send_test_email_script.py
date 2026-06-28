import importlib.util
import subprocess
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

from app.config import Settings


def _load_module():
    api_dir = Path(__file__).resolve().parents[1]
    script_path = api_dir / "scripts" / "send_test_email.py"
    spec = importlib.util.spec_from_file_location("send_test_email", script_path)
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
        "smtp_from_email": None,
        "smtp_password": "super_secret_password",
    }
    base.update(overrides)
    return Settings(**base)


def test_script_imports() -> None:
    module = _load_module()
    assert hasattr(module, "main")
    assert hasattr(module, "send_test_email")
    assert hasattr(module, "is_valid_email")


def test_missing_to_exits_nonzero() -> None:
    module = _load_module()
    with pytest.raises(SystemExit) as exc_info:
        module.main([])
    assert exc_info.value.code != 0


def test_invalid_email_exits_nonzero() -> None:
    module = _load_module()
    assert module.main(["--to", "not-an-email"]) == 1


def test_email_disabled_exits_safely(capsys) -> None:
    module = _load_module()
    settings = _settings(email_enabled=False, email_dry_run=True)

    exit_code = module.send_test_email("operator@example.com", settings=settings)
    captured = capsys.readouterr()

    assert exit_code == 1
    assert "Email is disabled" in captured.out


def test_dry_run_does_not_call_smtp_and_exits_success(capsys) -> None:
    module = _load_module()
    settings = _settings(
        email_enabled=True,
        email_dry_run=True,
        smtp_host="smtp.example.com",
        smtp_from_email="noreply@example.com",
    )

    with patch("app.services.email_service.smtplib.SMTP") as smtp_mock:
        exit_code = module.send_test_email("operator@example.com", settings=settings)
        captured = capsys.readouterr()

    assert exit_code == 0
    assert "no real email was sent" in captured.out.lower()
    smtp_mock.assert_not_called()


def test_live_mode_mocked_sends_one_message_to_explicit_recipient() -> None:
    module = _load_module()
    from app.services.email_service import EmailService

    settings = _settings(
        email_enabled=True,
        email_dry_run=False,
        smtp_host="smtp.example.com",
        smtp_from_email="noreply@example.com",
        smtp_user="smtp-user",
        smtp_password="secret",
    )
    service = EmailService(settings=settings)

    with patch.object(EmailService, "_send_via_smtp") as send_mock:
        exit_code = module.send_test_email(
            "operator@example.com",
            settings=settings,
            email_service=service,
        )

    assert exit_code == 0
    send_mock.assert_called_once()
    message = send_mock.call_args[0][0]
    assert message.to_email == "operator@example.com"


def test_smtp_password_is_not_printed(capsys) -> None:
    module = _load_module()
    secret = "super_secret_smtp_password_value"
    settings = _settings(
        email_enabled=True,
        email_dry_run=True,
        smtp_host="smtp.example.com",
        smtp_from_email="noreply@example.com",
        smtp_password=secret,
    )

    module.send_test_email("operator@example.com", settings=settings)
    captured = capsys.readouterr()

    assert secret not in captured.out
    assert secret not in captured.err
    assert "SMTP_PASSWORD" not in captured.out


def test_multiple_recipients_rejected() -> None:
    module = _load_module()
    assert module.main(["--to", "a@example.com,b@example.com"]) == 1


def test_subprocess_default_env_does_not_send_real_email() -> None:
    api_dir = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        [sys.executable, "scripts/send_test_email.py", "--to", "test@example.com"],
        cwd=api_dir,
        capture_output=True,
        text=True,
        check=False,
    )
    assert "super_secret" not in result.stdout
    assert result.returncode in (0, 1)
    output = (result.stdout + result.stderr).lower()
    assert "email is disabled" in output or "no real email was sent" in output
