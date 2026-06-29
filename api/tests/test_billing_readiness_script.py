"""Tests for scripts/check_billing_readiness.py."""

from __future__ import annotations

import importlib.util
import subprocess
import sys
from pathlib import Path


def _load_script():
    script_path = Path(__file__).resolve().parents[1] / "scripts" / "check_billing_readiness.py"
    spec = importlib.util.spec_from_file_location("check_billing_readiness", script_path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_billing_readiness_script_main_exits_zero() -> None:
    api_dir = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        [sys.executable, "scripts/check_billing_readiness.py"],
        cwd=api_dir,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    assert "SubscriptionPlan enum values" in result.stdout
    assert "free, starter, business, pro" in result.stdout


def test_billing_readiness_imports_subscription_plan() -> None:
    module = _load_script()
    assert hasattr(module, "main")
