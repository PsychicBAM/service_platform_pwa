#!/usr/bin/env python3
"""Run basic backend quality checks from the api/ directory."""

from __future__ import annotations

import compileall
import re
import subprocess
import sys
from pathlib import Path


def main() -> int:
    api_dir = Path(__file__).resolve().parents[1]
    project_root = api_dir.parent
    readme = project_root / "README_BACKEND.md"
    alembic_ini = api_dir / "alembic.ini"
    app_dir = api_dir / "app"

    errors: list[str] = []

    print("==> Compiling api/app ...")
    if not compileall.compile_dir(app_dir, quiet=1):
        errors.append("compileall failed for api/app")

    print("==> Importing app.main ...")
    sys.path.insert(0, str(api_dir))
    try:
        import app.main  # noqa: F401
    except Exception as exc:  # pragma: no cover - diagnostic script
        errors.append(f"import app.main failed: {exc}")
        return 1

    print("==> Importing core models ...")
    try:
        from app.database import Base
        import app.models  # noqa: F401

        required_tables = {
            "users",
            "businesses",
            "business_members",
            "subscriptions",
            "services",
            "working_hours",
            "working_breaks",
            "unavailable_times",
            "clients",
            "bookings",
            "orders",
            "order_messages",
            "audit_logs",
        }
        missing = required_tables - set(Base.metadata.tables.keys())
        if missing:
            errors.append(f"missing tables in metadata: {sorted(missing)}")
    except Exception as exc:  # pragma: no cover - diagnostic script
        errors.append(f"model import failed: {exc}")

    print("==> Verifying OpenAPI route groups ...")
    try:
        from app.main import app

        paths = app.openapi()["paths"]

        required_paths = {
            "/health": {"get"},
            "/api/v1/auth/register": {"post"},
            "/api/v1/businesses/{business_id}": {"get", "patch"},
            "/api/v1/public/b/{slug}": {"get"},
            "/api/v1/public/b/{slug}/services": {"get"},
            "/api/v1/public/b/{slug}/availability": {"get"},
            "/api/v1/public/b/{slug}/bookings": {"post"},
            "/api/v1/public/b/{slug}/orders": {"post"},
            "/api/v1/businesses/{business_id}/bookings": {"get"},
            "/api/v1/businesses/{business_id}/orders": {"get"},
            "/api/v1/me/bookings": {"get"},
            "/api/v1/me/orders": {"get"},
            "/api/v1/businesses/{business_id}/clients": {"get"},
            "/api/v1/superadmin/businesses": {"get"},
            "/api/v1/superadmin/businesses/{business_id}": {"get", "patch"},
            "/api/v1/superadmin/audit-logs": {"get"},
        }
        for path, methods in required_paths.items():
            if path not in paths:
                errors.append(f"{path} missing from OpenAPI")
                continue
            for method in methods:
                if method not in paths[path]:
                    errors.append(f"{method.upper()} {path} missing from OpenAPI")

        legacy_checks = [
            ("/api/v1/auth/login", None),
            ("/api/v1/businesses/{business_id}/services", None),
            ("/api/v1/businesses/{business_id}/schedule", None),
            ("/api/v1/businesses/{business_id}/bookings/{booking_id}", None),
            ("/api/v1/businesses/{business_id}/orders/{order_id}", None),
            ("/api/v1/businesses/{business_id}/orders/{order_id}/accept", {"post"}),
            ("/api/v1/businesses/{business_id}/clients/{client_id}", None),
            ("/api/v1/me/bookings/{booking_id}", None),
            ("/api/v1/me/orders/{order_id}", None),
        ]
        for path, required_methods in legacy_checks:
            if path not in paths:
                errors.append(f"{path} missing from OpenAPI")
            elif required_methods:
                for method in required_methods:
                    if method not in paths[path]:
                        errors.append(f"{method.upper()} {path} missing from OpenAPI")
    except Exception as exc:  # pragma: no cover - diagnostic script
        errors.append(f"OpenAPI check failed: {exc}")

    print("==> Verifying checkpoint scripts exist ...")
    scripts_dir = api_dir / "scripts"
    for script_name in ("seed_demo.py", "e2e_backend_audit.py"):
        if not (scripts_dir / script_name).is_file():
            errors.append(f"scripts/{script_name} not found")

    print("==> Checking required files ...")
    if not alembic_ini.is_file():
        errors.append("alembic.ini not found")
    if readme.is_file():
        print(f"    Found {readme}")
    else:
        print(
            "    Skipping README_BACKEND.md check "
            "(not at project root; run from host for full check)"
        )

    print("==> Running pytest ...")
    result = subprocess.run(
        [sys.executable, "-m", "pytest", "-q"],
        cwd=api_dir,
        capture_output=True,
        text=True,
        check=False,
    )
    print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    if result.returncode != 0:
        errors.append("pytest failed")
    elif re.search(r"\d+ skipped", result.stdout):
        errors.append("pytest had skipped tests")

    if errors:
        print("\nFAILED:")
        for err in errors:
            print(f"  - {err}")
        return 1

    print("\nAll backend checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
