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


def test_script_output_includes_reset_password_base_url_config(capsys) -> None:
    module = _load_module()
    exit_code = module.main()
    captured = capsys.readouterr()
    assert exit_code == 0
    assert "PASSWORD_RESET_BASE_URL" in captured.out
    assert "reset-password" in captured.out.lower()


def test_script_output_confirms_raw_token_not_stored(capsys) -> None:
    module = _load_module()
    exit_code = module.main()
    captured = capsys.readouterr()
    assert exit_code == 0
    assert "raw token is not stored" in captured.out.lower()


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
    assert "PASSWORD_RESET_BASE_URL" in result.stdout
    assert "raw token is not stored" in result.stdout.lower()
