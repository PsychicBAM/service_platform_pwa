import importlib.util
import subprocess
import sys
from pathlib import Path


def _load_module():
    api_dir = Path(__file__).resolve().parents[1]
    script_path = api_dir / "scripts" / "check_password_reset.py"
    spec = importlib.util.spec_from_file_location("check_password_reset", script_path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_script_imports_successfully() -> None:
    module = _load_module()
    assert hasattr(module, "run_audit")
    assert hasattr(module, "NO_REAL_EMAILS")


def test_script_has_main_function() -> None:
    module = _load_module()
    assert hasattr(module, "main")
    assert callable(module.main)


def test_script_runs_without_smtp() -> None:
    module = _load_module()
    assert module.main() == 0


def test_script_output_mentions_no_real_emails_sent(capsys) -> None:
    module = _load_module()
    exit_code = module.main()
    captured = capsys.readouterr()
    assert exit_code == 0
    assert "no real emails" in captured.out.lower()


def test_script_output_uses_neutral_config_wording(capsys) -> None:
    module = _load_module()
    exit_code = module.main()
    captured = capsys.readouterr()
    assert exit_code == 0
    assert "Reset token expiration setting is present." in captured.out
    assert "Reset page base URL setting is present." in captured.out
    assert "Password reset routes are registered." in captured.out
    assert "Password reset email template builds with redacted sample token." in captured.out


def test_script_output_does_not_print_password_reset_config_values(capsys) -> None:
    module = _load_module()
    from app.config import get_settings

    settings = get_settings()
    exit_code = module.main()
    captured = capsys.readouterr()
    assert exit_code == 0
    assert str(settings.password_reset_token_expire_hours) not in captured.out
    assert settings.password_reset_base_url not in captured.out
    assert "example-token-redacted" not in captured.out
    assert "audit-sample-reset-token" not in captured.out
    assert "audit-mock-reset-token" not in captured.out


def test_script_summary_does_not_append_details(capsys) -> None:
    module = _load_module()
    exit_code = module.main()
    captured = capsys.readouterr()
    assert exit_code == 0
    for line in captured.out.splitlines():
        if line.strip().startswith("[PASS]") or line.strip().startswith("[WARN]"):
            assert " — " not in line
            assert ": " not in line.split("]", 1)[-1]


def test_script_runs_as_subprocess_without_smtp() -> None:
    api_dir = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        [sys.executable, "scripts/check_password_reset.py"],
        cwd=api_dir,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0
    assert "no real emails" in result.stdout.lower()
    assert "Reset page base URL setting is present." in result.stdout
    assert "Password reset routes are registered." in result.stdout
