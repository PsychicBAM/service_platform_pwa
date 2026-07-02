"""Ensure scripts and password paths do not leak password_hash in logs."""

from __future__ import annotations

import os
import subprocess
import sys

from app.services.password_service import hash_password, verify_password

_BCRYPT_PREFIXES = ("$2b$", "$2a$", "$2y$")


def _output_is_clean(stdout: str, stderr: str) -> bool:
    combined = f"{stdout}\n{stderr}".lower()
    if "password_hash" in combined:
        return False
    return not any(prefix in combined for prefix in _BCRYPT_PREFIXES)


def test_password_service_subprocess_has_no_hash_leaks() -> None:
    code = (
        "from app.services.password_service import hash_password, verify_password; "
        "hashed = hash_password('example-password-redacted'); "
        "print('hash_generated', bool(hashed)); "
        "print('verify_ok', verify_password('example-password-redacted', hashed))"
    )
    result = subprocess.run(
        [sys.executable, "-c", code],
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    assert _output_is_clean(result.stdout, result.stderr)
    assert "hash_generated True" in result.stdout


def test_seed_demo_subprocess_has_no_password_hash_leaks() -> None:
    result = subprocess.run(
        [sys.executable, "scripts/seed_demo.py"],
        capture_output=True,
        text=True,
        check=False,
        cwd="/app",
    )
    assert result.returncode == 0, result.stderr
    assert _output_is_clean(result.stdout, result.stderr)
    assert "Demo seed complete." in result.stdout


def test_seed_demo_subprocess_ignores_sql_echo_env() -> None:
    """Even with SQLALCHEMY_ECHO=true, seed_demo must not log password_hash values."""
    env = {**os.environ, "SQLALCHEMY_ECHO": "true"}
    result = subprocess.run(
        [sys.executable, "scripts/seed_demo.py"],
        capture_output=True,
        text=True,
        check=False,
        cwd="/app",
        env=env,
    )
    assert result.returncode == 0, result.stderr
    assert _output_is_clean(result.stdout, result.stderr)


def test_hash_password_does_not_print_hash_value(capsys) -> None:
    hashed = hash_password("securePass123")
    captured = capsys.readouterr()
    assert hashed not in captured.out
    assert hashed not in captured.err
    assert verify_password("securePass123", hashed)
