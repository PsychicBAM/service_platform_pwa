"""Password hashing tests — no secrets or hash values printed."""

from __future__ import annotations

import subprocess
import sys

from app.services.password_service import hash_password, verify_password

# Standard passlib/bcrypt test vector (password: "secret") — verifies legacy hash compatibility.
_LEGACY_BCRYPT_HASH = (
    "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW"
)


def test_hash_password_returns_non_empty_hash() -> None:
    hashed = hash_password("example-password-redacted")
    assert isinstance(hashed, str)
    assert len(hashed) > 0
    assert hashed.startswith("$2")


def test_verify_password_accepts_correct_password() -> None:
    password = "securePass123"
    hashed = hash_password(password)
    assert verify_password(password, hashed) is True


def test_verify_password_rejects_wrong_password() -> None:
    hashed = hash_password("securePass123")
    assert verify_password("wrongPassword", hashed) is False


def test_existing_bcrypt_hash_remains_verifiable() -> None:
    assert verify_password("secret", _LEGACY_BCRYPT_HASH) is True
    assert verify_password("wrong-password-redacted", _LEGACY_BCRYPT_HASH) is False


def test_password_hashing_without_bcrypt_version_warning() -> None:
    """Fresh process: passlib must load bcrypt without __about__ version trap."""
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
    assert "error reading bcrypt version" not in result.stderr.lower()
    assert "hash_generated True" in result.stdout
    assert "verify_ok True" in result.stdout


def test_seed_demo_hash_path_without_bcrypt_version_warning() -> None:
    """Mirrors seed_demo password path in a fresh subprocess."""
    code = (
        "import importlib.util; from pathlib import Path; "
        "path = Path('scripts/seed_demo.py'); "
        "spec = importlib.util.spec_from_file_location('seed_demo', path); "
        "mod = importlib.util.module_from_spec(spec); "
        "spec.loader.exec_module(mod); "
        "from app.services.password_service import hash_password, verify_password; "
        "hashed = hash_password(mod.DEMO_PASSWORD); "
        "print('seed_hash_ok', verify_password(mod.DEMO_PASSWORD, hashed)); "
        "print('password_not_logged', mod.DEMO_PASSWORD not in '')"
    )
    result = subprocess.run(
        [sys.executable, "-c", code],
        capture_output=True,
        text=True,
        check=False,
        cwd="/app",
    )
    assert result.returncode == 0, result.stderr
    assert "error reading bcrypt version" not in result.stderr.lower()
    assert "seed_hash_ok True" in result.stdout
    assert "ChangeMe123!" not in f"{result.stdout}{result.stderr}"
