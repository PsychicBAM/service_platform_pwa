"""Tests for scripts/check_billing_flow.py."""

from __future__ import annotations

import importlib.util
import os
import subprocess
import sys
from pathlib import Path


def _load_script():
    script_path = Path(__file__).resolve().parents[1] / "scripts" / "check_billing_flow.py"
    spec = importlib.util.spec_from_file_location("check_billing_flow", script_path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_billing_flow_audit_script_imports_successfully() -> None:
    module = _load_script()
    assert module is not None
    assert hasattr(module, "NO_REAL_STRIPE")


def test_billing_flow_audit_script_has_main() -> None:
    module = _load_script()
    assert hasattr(module, "main")
    assert callable(module.main)


def test_billing_flow_audit_runs_with_stripe_disabled() -> None:
    api_dir = Path(__file__).resolve().parents[1]
    env = {**os.environ, "STRIPE_ENABLED": "false"}
    result = subprocess.run(
        [sys.executable, "scripts/check_billing_flow.py"],
        cwd=api_dir,
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    assert "STRIPE_ENABLED=False" in result.stdout
    assert "Billing flow smoke audit passed." in result.stdout


def test_billing_flow_audit_output_mentions_no_real_stripe() -> None:
    api_dir = Path(__file__).resolve().parents[1]
    env = {**os.environ, "STRIPE_ENABLED": "false"}
    result = subprocess.run(
        [sys.executable, "scripts/check_billing_flow.py"],
        cwd=api_dir,
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )
    combined = result.stdout + result.stderr
    assert "No real Stripe API calls or payments" in combined


def test_billing_flow_audit_output_includes_checkout_endpoint_check() -> None:
    api_dir = Path(__file__).resolve().parents[1]
    env = {**os.environ, "STRIPE_ENABLED": "false"}
    result = subprocess.run(
        [sys.executable, "scripts/check_billing_flow.py"],
        cwd=api_dir,
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )
    assert "/api/v1/businesses/{business_id}/billing/checkout-session" in result.stdout
    assert "checkout endpoint" in result.stdout.lower()


def test_billing_flow_audit_output_includes_webhook_endpoint_check() -> None:
    api_dir = Path(__file__).resolve().parents[1]
    env = {**os.environ, "STRIPE_ENABLED": "false"}
    result = subprocess.run(
        [sys.executable, "scripts/check_billing_flow.py"],
        cwd=api_dir,
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )
    assert "/api/v1/billing/stripe/webhook" in result.stdout
    assert "webhook endpoint" in result.stdout.lower()


def test_billing_flow_audit_output_does_not_expose_secret_values() -> None:
    api_dir = Path(__file__).resolve().parents[1]
    secret = "sk_test_never_print_this_billing_flow_secret"
    webhook = "whsec_never_print_this_billing_flow_webhook"
    env = {
        **os.environ,
        "STRIPE_ENABLED": "true",
        "STRIPE_SECRET_KEY": secret,
        "STRIPE_WEBHOOK_SECRET": webhook,
        "STRIPE_PRICE_STARTER": "price_starter_flow_audit_001",
        "STRIPE_PRICE_BUSINESS": "price_business_flow_audit_001",
        "STRIPE_PRICE_PRO": "price_pro_flow_audit_001",
    }
    result = subprocess.run(
        [sys.executable, "scripts/check_billing_flow.py"],
        cwd=api_dir,
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )
    combined = result.stdout + result.stderr
    assert secret not in combined
    assert webhook not in combined
    assert "STRIPE_SECRET_KEY: configured" not in combined
    assert "STRIPE_WEBHOOK_SECRET: configured" not in combined
    assert "values are not inspected or printed here" in combined
