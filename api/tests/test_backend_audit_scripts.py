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
    assert (api_dir / "scripts" / "e2e_backend_audit.py").is_file()


def test_seed_demo_script_exists() -> None:
    api_dir = Path(__file__).resolve().parents[1]
    assert (api_dir / "scripts" / "seed_demo.py").is_file()
