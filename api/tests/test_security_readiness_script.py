"""Tests for scripts/check_security_readiness.py."""

from __future__ import annotations

import importlib.util
import os
import subprocess
import sys
from pathlib import Path


def _load_script():
    script_path = Path(__file__).resolve().parents[1] / "scripts" / "check_security_readiness.py"
    spec = importlib.util.spec_from_file_location("check_security_readiness", script_path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _run_script(env: dict[str, str]) -> subprocess.CompletedProcess[str]:
    api_dir = Path(__file__).resolve().parents[1]
    return subprocess.run(
        [sys.executable, "scripts/check_security_readiness.py"],
        cwd=api_dir,
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )


def test_security_readiness_script_imports_successfully() -> None:
    module = _load_script()
    assert module is not None
    assert hasattr(module, "NO_SCANNERS")


def test_security_readiness_script_has_main() -> None:
    module = _load_script()
    assert hasattr(module, "main")
    assert callable(module.main)


def test_security_readiness_runs_in_local_env() -> None:
    env = {**os.environ, "APP_ENV": "local", "STRIPE_ENABLED": "false"}
    result = _run_script(env)
    assert result.returncode == 0, result.stdout + result.stderr
    assert "Security readiness audit passed." in result.stdout
    assert "No security scanners" in result.stdout


def test_security_readiness_output_does_not_expose_secrets() -> None:
    secret = "sk_test_never_print_security_readiness_secret"
    jwt = "super_secret_jwt_value_never_print_this"
    env = {
        **os.environ,
        "APP_ENV": "local",
        "STRIPE_SECRET_KEY": secret,
        "JWT_SECRET_KEY": jwt,
    }
    result = _run_script(env)
    combined = result.stdout + result.stderr
    assert secret not in combined
    assert jwt not in combined
    assert "JWT_SECRET_KEY: configured" not in combined
    assert "STRIPE_SECRET_KEY:" not in combined
    assert "STRIPE_WEBHOOK_SECRET" not in combined


def test_security_readiness_fails_production_cors_wildcard() -> None:
    env = {
        **os.environ,
        "APP_ENV": "production",
        "CORS_ORIGINS": "*",
        "JWT_SECRET_KEY": "a" * 32,
        "API_DOCS_ENABLED": "false",
    }
    result = _run_script(env)
    assert result.returncode != 0
    combined = result.stdout + result.stderr
    assert (
        "CORS" in combined
        or "Wildcard" in combined
        or "Settings validation failed" in combined
    )


def test_security_readiness_fails_production_api_docs_enabled() -> None:
    env = {
        **os.environ,
        "APP_ENV": "production",
        "CORS_ORIGINS": "https://app.example.com",
        "JWT_SECRET_KEY": "a" * 32,
        "API_DOCS_ENABLED": "true",
    }
    result = _run_script(env)
    assert result.returncode != 0
    assert "API docs" in result.stdout


def test_security_readiness_fails_production_short_jwt() -> None:
    env = {
        **os.environ,
        "APP_ENV": "production",
        "CORS_ORIGINS": "https://app.example.com",
        "JWT_SECRET_KEY": "short",
        "API_DOCS_ENABLED": "false",
    }
    result = _run_script(env)
    assert result.returncode != 0
    assert "JWT_SECRET_KEY is too short for production." in result.stdout
