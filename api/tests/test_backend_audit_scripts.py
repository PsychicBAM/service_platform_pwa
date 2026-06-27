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
