import importlib.util
from pathlib import Path


def _load_script_module(name: str):
    api_dir = Path(__file__).resolve().parents[1]
    path = api_dir / "scripts" / f"{name}.py"
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_seed_demo_imports_cleanly() -> None:
    module = _load_script_module("seed_demo")
    assert hasattr(module, "main")
    assert hasattr(module, "seed_demo")
    assert module.DEMO_PASSWORD
    assert module.BUSINESS_SLUG == "demo-business"
    assert module.LINKED_CLIENT_EMAIL == "client@example.com"


def test_e2e_backend_audit_imports_cleanly() -> None:
    module = _load_script_module("e2e_backend_audit")
    assert hasattr(module, "main")
    assert hasattr(module, "run_audit")
    assert module.OWNER_EMAIL == "owner@example.com"
    assert module.CLIENT_EMAIL == "client@example.com"
    source = (Path(__file__).resolve().parents[1] / "scripts" / "e2e_backend_audit.py").read_text(
        encoding="utf-8"
    )
    assert "/me/bookings" in source
    assert "/me/orders" in source
