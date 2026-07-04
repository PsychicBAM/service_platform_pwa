import importlib.util
from pathlib import Path


def test_check_backend_has_main() -> None:
    api_dir = Path(__file__).resolve().parents[1]
    path = api_dir / "scripts" / "check_backend.py"
    spec = importlib.util.spec_from_file_location("check_backend", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    assert hasattr(module, "main")
    assert hasattr(module, "_evaluate_pytest_result")


def test_check_backend_pytest_skipped_tests_are_warnings_not_failures() -> None:
    api_dir = Path(__file__).resolve().parents[1]
    path = api_dir / "scripts" / "check_backend.py"
    spec = importlib.util.spec_from_file_location("check_backend_eval", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    errors, warnings = module._evaluate_pytest_result(
        0,
        "670 passed, 14 skipped, 2 warnings in 120.00s",
    )
    assert errors == []
    assert warnings == ["pytest completed with skipped tests: 14"]


def test_check_backend_pytest_non_zero_exit_still_fails() -> None:
    api_dir = Path(__file__).resolve().parents[1]
    path = api_dir / "scripts" / "check_backend.py"
    spec = importlib.util.spec_from_file_location("check_backend_eval_fail", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    errors, warnings = module._evaluate_pytest_result(
        1,
        "668 passed, 14 skipped, 2 failed in 120.00s",
    )
    assert errors == ["pytest failed"]
    assert warnings == []


def test_check_backend_pytest_zero_skipped_has_no_warning() -> None:
    api_dir = Path(__file__).resolve().parents[1]
    path = api_dir / "scripts" / "check_backend.py"
    spec = importlib.util.spec_from_file_location("check_backend_eval_clean", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    errors, warnings = module._evaluate_pytest_result(
        0,
        "684 passed, 2 warnings in 90.00s",
    )
    assert errors == []
    assert warnings == []


def test_e2e_audit_script_exists() -> None:
    api_dir = Path(__file__).resolve().parents[1]
    path = api_dir / "scripts" / "e2e_backend_audit.py"
    assert path.is_file()
    source = path.read_text(encoding="utf-8")
    assert "/me/bookings" in source
    assert "/me/orders" in source


def test_seed_demo_script_exists() -> None:
    api_dir = Path(__file__).resolve().parents[1]
    path = api_dir / "scripts" / "seed_demo.py"
    assert path.is_file()
    source = path.read_text(encoding="utf-8")
    assert "client@example.com" in source
    assert "linked_client" in source or "LINKED_CLIENT_EMAIL" in source
