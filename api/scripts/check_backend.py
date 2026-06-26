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
        }
        missing = required_tables - set(Base.metadata.tables.keys())
        if missing:
            errors.append(f"missing tables in metadata: {sorted(missing)}")
    except Exception as exc:  # pragma: no cover - diagnostic script
        errors.append(f"model import failed: {exc}")

    print("==> Verifying auth router in OpenAPI ...")
    try:
        from app.main import app

        paths = app.openapi()["paths"]
        if "/api/v1/auth/register" not in paths:
            errors.append("/api/v1/auth/register missing from OpenAPI schema")
        if "/api/v1/auth/login" not in paths:
            errors.append("/api/v1/auth/login missing from OpenAPI schema")
        if "/api/v1/businesses/{business_id}/services" not in paths:
            errors.append("/api/v1/businesses/{business_id}/services missing from OpenAPI")
        if "/api/v1/public/b/{slug}/services" not in paths:
            errors.append("/api/v1/public/b/{slug}/services missing from OpenAPI")
        if "/api/v1/businesses/{business_id}/schedule" not in paths:
            errors.append("/api/v1/businesses/{business_id}/schedule missing from OpenAPI")
        if "/api/v1/public/b/{slug}/availability" not in paths:
            errors.append("/api/v1/public/b/{slug}/availability missing from OpenAPI")
    except Exception as exc:  # pragma: no cover - diagnostic script
        errors.append(f"OpenAPI auth check failed: {exc}")

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
