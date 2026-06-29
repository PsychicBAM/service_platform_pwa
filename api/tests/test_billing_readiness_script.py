"""Tests for scripts/check_billing_readiness.py."""

from __future__ import annotations

import importlib.util
import os
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


def test_billing_readiness_script_runs_with_stripe_disabled() -> None:
    api_dir = Path(__file__).resolve().parents[1]
    env = {**os.environ, "STRIPE_ENABLED": "false"}
    result = subprocess.run(
        [sys.executable, "scripts/check_billing_readiness.py"],
        cwd=api_dir,
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    assert "STRIPE_ENABLED=False" in result.stdout
    assert "Stripe disabled — billing remains manual/demo." in result.stdout
    assert "free, starter, business, pro" in result.stdout


def test_billing_readiness_output_does_not_expose_secret_values() -> None:
    api_dir = Path(__file__).resolve().parents[1]
    secret = "sk_test_never_print_this_secret_value"
    webhook = "whsec_never_print_this_webhook_secret"
    env = {
        **os.environ,
        "STRIPE_ENABLED": "true",
        "STRIPE_SECRET_KEY": secret,
        "STRIPE_WEBHOOK_SECRET": webhook,
        "STRIPE_PRICE_STARTER": "price_starter_test_001",
        "STRIPE_PRICE_BUSINESS": "price_business_test_001",
        "STRIPE_PRICE_PRO": "price_pro_test_001",
    }
    result = subprocess.run(
        [sys.executable, "scripts/check_billing_readiness.py"],
        cwd=api_dir,
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )
    combined = result.stdout + result.stderr
    assert secret not in combined
    assert webhook not in combined
    assert "STRIPE_SECRET_KEY: configured" in combined
    assert "STRIPE_WEBHOOK_SECRET: configured" in combined


def test_billing_readiness_enabled_complete_config_passes() -> None:
    api_dir = Path(__file__).resolve().parents[1]
    env = {
        **os.environ,
        "STRIPE_ENABLED": "true",
        "STRIPE_SECRET_KEY": "sk_test_billing_readiness_only",
        "STRIPE_WEBHOOK_SECRET": "whsec_billing_readiness_only",
        "STRIPE_PRICE_STARTER": "price_starter_test_001",
        "STRIPE_PRICE_BUSINESS": "price_business_test_001",
        "STRIPE_PRICE_PRO": "price_pro_test_001",
    }
    result = subprocess.run(
        [sys.executable, "scripts/check_billing_readiness.py"],
        cwd=api_dir,
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    assert "STRIPE price for starter: configured" in result.stdout


def test_billing_readiness_imports_subscription_plan() -> None:
    module = _load_script()
    assert hasattr(module, "main")
