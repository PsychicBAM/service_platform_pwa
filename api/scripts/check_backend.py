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

        print("==> Importing email modules ...")
        import app.services.email_service  # noqa: F401
        import app.services.email_templates  # noqa: F401
        import app.services.email_notification_service  # noqa: F401
        import app.services.email_verification_service  # noqa: F401
        import app.services.password_reset_service  # noqa: F401
        import app.models.email_verification_token  # noqa: F401
        import app.models.password_reset_token  # noqa: F401
        import app.services.stripe_config  # noqa: F401
        import app.services.billing_service  # noqa: F401
        import app.routers.billing  # noqa: F401
        import app.schemas.billing  # noqa: F401

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
            "email_verification_tokens",
            "password_reset_tokens",
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
            "/api/v1/auth/verify-email": {"post"},
            "/api/v1/auth/resend-verification": {"post"},
            "/api/v1/auth/request-password-reset": {"post"},
            "/api/v1/auth/reset-password": {"post"},
            "/api/v1/businesses/{business_id}": {"get", "patch"},
            "/api/v1/businesses/{business_id}/billing/checkout-session": {"post"},
            "/api/v1/billing/stripe/webhook": {"post"},
            "/api/v1/public/b/{slug}": {"get"},
            "/api/v1/public/b/{slug}/services": {"get"},
            "/api/v1/public/b/{slug}/availability": {"get"},
            "/api/v1/public/b/{slug}/bookings": {"post"},
            "/api/v1/public/b/{slug}/orders": {"post"},
            "/api/v1/businesses/{business_id}/bookings": {"get"},
            "/api/v1/businesses/{business_id}/orders": {"get"},
            "/api/v1/me/bookings": {"get"},
            "/api/v1/me/orders": {"get"},
            "/api/v1/me/claims/bookings": {"post"},
            "/api/v1/me/claims/orders": {"post"},
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
    for script_name in (
        "seed_demo.py",
        "e2e_backend_audit.py",
        "check_email_notifications.py",
        "check_email_verification.py",
        "check_password_reset.py",
        "send_test_email.py",
    ):
        if not (scripts_dir / script_name).is_file():
            errors.append(f"scripts/{script_name} not found")

    print("==> Import smoke for email notification audit ...")
    try:
        import importlib.util

        audit_path = scripts_dir / "check_email_notifications.py"
        spec = importlib.util.spec_from_file_location("check_email_notifications", audit_path)
        if spec and spec.loader:
            audit_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(audit_module)
            if not hasattr(audit_module, "main"):
                errors.append("check_email_notifications.py missing main()")
        else:
            errors.append("check_email_notifications.py import spec failed")
    except Exception as exc:  # pragma: no cover - diagnostic script
        errors.append(f"check_email_notifications import failed: {exc}")

    print("==> Import smoke for email verification audit ...")
    try:
        import importlib.util

        verify_audit_path = scripts_dir / "check_email_verification.py"
        spec = importlib.util.spec_from_file_location(
            "check_email_verification", verify_audit_path
        )
        if spec and spec.loader:
            verify_audit_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(verify_audit_module)
            if not hasattr(verify_audit_module, "main"):
                errors.append("check_email_verification.py missing main()")
        else:
            errors.append("check_email_verification.py import spec failed")
    except Exception as exc:  # pragma: no cover - diagnostic script
        errors.append(f"check_email_verification import failed: {exc}")

    print("==> Import smoke for password reset audit ...")
    try:
        import importlib.util

        reset_audit_path = scripts_dir / "check_password_reset.py"
        spec = importlib.util.spec_from_file_location(
            "check_password_reset", reset_audit_path
        )
        if spec and spec.loader:
            reset_audit_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(reset_audit_module)
            if not hasattr(reset_audit_module, "main"):
                errors.append("check_password_reset.py missing main()")
        else:
            errors.append("check_password_reset.py import spec failed")
    except Exception as exc:  # pragma: no cover - diagnostic script
        errors.append(f"check_password_reset import failed: {exc}")

    print("==> Import smoke for send_test_email ...")
    try:
        send_test_path = scripts_dir / "send_test_email.py"
        spec = importlib.util.spec_from_file_location("send_test_email", send_test_path)
        if spec and spec.loader:
            send_test_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(send_test_module)
            if not hasattr(send_test_module, "main"):
                errors.append("send_test_email.py missing main()")
        else:
            errors.append("send_test_email.py import spec failed")
    except Exception as exc:  # pragma: no cover - diagnostic script
        errors.append(f"send_test_email import failed: {exc}")

    print("==> Running email notification dry-run audit ...")
    audit_result = subprocess.run(
        [sys.executable, "scripts/check_email_notifications.py"],
        cwd=api_dir,
        capture_output=True,
        text=True,
        check=False,
    )
    print(audit_result.stdout)
    if audit_result.stderr:
        print(audit_result.stderr, file=sys.stderr)
    if audit_result.returncode != 0:
        errors.append("check_email_notifications.py failed")

    print("==> Running email verification dry-run audit ...")
    verify_audit_result = subprocess.run(
        [sys.executable, "scripts/check_email_verification.py"],
        cwd=api_dir,
        capture_output=True,
        text=True,
        check=False,
    )
    print(verify_audit_result.stdout)
    if verify_audit_result.stderr:
        print(verify_audit_result.stderr, file=sys.stderr)
    if verify_audit_result.returncode != 0:
        errors.append("check_email_verification.py failed")

    print("==> Running password reset dry-run audit ...")
    reset_audit_result = subprocess.run(
        [sys.executable, "scripts/check_password_reset.py"],
        cwd=api_dir,
        capture_output=True,
        text=True,
        check=False,
    )
    print(reset_audit_result.stdout)
    if reset_audit_result.stderr:
        print(reset_audit_result.stderr, file=sys.stderr)
    if reset_audit_result.returncode != 0:
        errors.append("check_password_reset.py failed")

    print("==> Running billing readiness checkpoint ...")
    billing_result = subprocess.run(
        [sys.executable, "scripts/check_billing_readiness.py"],
        cwd=api_dir,
        capture_output=True,
        text=True,
        check=False,
    )
    print(billing_result.stdout)
    if billing_result.stderr:
        print(billing_result.stderr, file=sys.stderr)
    if billing_result.returncode != 0:
        errors.append("check_billing_readiness.py failed")

    billing_flow_script = api_dir / "scripts" / "check_billing_flow.py"
    print("==> Checking billing flow audit script ...")
    if not billing_flow_script.is_file():
        errors.append("check_billing_flow.py not found")
    else:
        print(f"    Found {billing_flow_script.name}")
        try:
            import importlib.util

            spec = importlib.util.spec_from_file_location(
                "check_billing_flow_smoke", billing_flow_script
            )
            if spec and spec.loader:
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                if not hasattr(module, "main"):
                    errors.append("check_billing_flow.py missing main()")
            else:
                errors.append("check_billing_flow.py import smoke failed")
        except Exception as exc:
            errors.append(f"check_billing_flow.py import smoke failed: {exc}")

        print("==> Running billing flow smoke audit ...")
        billing_flow_result = subprocess.run(
            [sys.executable, "scripts/check_billing_flow.py"],
            cwd=api_dir,
            capture_output=True,
            text=True,
            check=False,
        )
        print(billing_flow_result.stdout)
        if billing_flow_result.stderr:
            print(billing_flow_result.stderr, file=sys.stderr)
        if billing_flow_result.returncode != 0:
            errors.append("check_billing_flow.py failed")

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
