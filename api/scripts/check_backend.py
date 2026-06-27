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
        bookings_path = "/api/v1/public/b/{slug}/bookings"
        if bookings_path not in paths:
            errors.append(f"{bookings_path} missing from OpenAPI")
        elif "post" not in paths[bookings_path]:
            errors.append(f"POST {bookings_path} missing from OpenAPI")
        orders_path = "/api/v1/public/b/{slug}/orders"
        if orders_path not in paths:
            errors.append(f"{orders_path} missing from OpenAPI")
        elif "post" not in paths[orders_path]:
            errors.append(f"POST {orders_path} missing from OpenAPI")
        admin_orders_list = "/api/v1/businesses/{business_id}/orders"
        if admin_orders_list not in paths:
            errors.append(f"{admin_orders_list} missing from OpenAPI")
        admin_order_detail = "/api/v1/businesses/{business_id}/orders/{order_id}"
        if admin_order_detail not in paths:
            errors.append(f"{admin_order_detail} missing from OpenAPI")
        admin_order_accept = "/api/v1/businesses/{business_id}/orders/{order_id}/accept"
        if admin_order_accept not in paths:
            errors.append(f"{admin_order_accept} missing from OpenAPI")
        elif "post" not in paths[admin_order_accept]:
            errors.append(f"POST {admin_order_accept} missing from OpenAPI")
        admin_order_decline = "/api/v1/businesses/{business_id}/orders/{order_id}/decline"
        if admin_order_decline not in paths:
            errors.append(f"{admin_order_decline} missing from OpenAPI")
        elif "post" not in paths[admin_order_decline]:
            errors.append(f"POST {admin_order_decline} missing from OpenAPI")
        admin_order_complete = "/api/v1/businesses/{business_id}/orders/{order_id}/complete"
        if admin_order_complete not in paths:
            errors.append(f"{admin_order_complete} missing from OpenAPI")
        elif "post" not in paths[admin_order_complete]:
            errors.append(f"POST {admin_order_complete} missing from OpenAPI")
        admin_list = "/api/v1/businesses/{business_id}/bookings"
        if admin_list not in paths:
            errors.append(f"{admin_list} missing from OpenAPI")
        admin_detail = "/api/v1/businesses/{business_id}/bookings/{booking_id}"
        if admin_detail not in paths:
            errors.append(f"{admin_detail} missing from OpenAPI")
        admin_cancel = "/api/v1/businesses/{business_id}/bookings/{booking_id}/cancel"
        if admin_cancel not in paths:
            errors.append(f"{admin_cancel} missing from OpenAPI")
        elif "post" not in paths[admin_cancel]:
            errors.append(f"POST {admin_cancel} missing from OpenAPI")
        me_list = "/api/v1/me/bookings"
        if me_list not in paths:
            errors.append(f"{me_list} missing from OpenAPI")
        me_detail = "/api/v1/me/bookings/{booking_id}"
        if me_detail not in paths:
            errors.append(f"{me_detail} missing from OpenAPI")
        me_cancel = "/api/v1/me/bookings/{booking_id}/cancel"
        if me_cancel not in paths:
            errors.append(f"{me_cancel} missing from OpenAPI")
        elif "post" not in paths[me_cancel]:
            errors.append(f"POST {me_cancel} missing from OpenAPI")
        me_reschedule = "/api/v1/me/bookings/{booking_id}/reschedule"
        if me_reschedule not in paths:
            errors.append(f"{me_reschedule} missing from OpenAPI")
        elif "post" not in paths[me_reschedule]:
            errors.append(f"POST {me_reschedule} missing from OpenAPI")
        me_orders_list = "/api/v1/me/orders"
        if me_orders_list not in paths:
            errors.append(f"{me_orders_list} missing from OpenAPI")
        me_order_detail = "/api/v1/me/orders/{order_id}"
        if me_order_detail not in paths:
            errors.append(f"{me_order_detail} missing from OpenAPI")
        me_order_cancel = "/api/v1/me/orders/{order_id}/cancel"
        if me_order_cancel not in paths:
            errors.append(f"{me_order_cancel} missing from OpenAPI")
        elif "post" not in paths[me_order_cancel]:
            errors.append(f"POST {me_order_cancel} missing from OpenAPI")
        me_order_messages = "/api/v1/me/orders/{order_id}/messages"
        if me_order_messages not in paths:
            errors.append(f"{me_order_messages} missing from OpenAPI")
        elif "post" not in paths[me_order_messages]:
            errors.append(f"POST {me_order_messages} missing from OpenAPI")
        admin_order_messages = "/api/v1/businesses/{business_id}/orders/{order_id}/messages"
        if admin_order_messages not in paths:
            errors.append(f"{admin_order_messages} missing from OpenAPI")
        elif "post" not in paths[admin_order_messages]:
            errors.append(f"POST {admin_order_messages} missing from OpenAPI")
        admin_clients_list = "/api/v1/businesses/{business_id}/clients"
        if admin_clients_list not in paths:
            errors.append(f"{admin_clients_list} missing from OpenAPI")
        admin_client_detail = "/api/v1/businesses/{business_id}/clients/{client_id}"
        if admin_client_detail not in paths:
            errors.append(f"{admin_client_detail} missing from OpenAPI")
        admin_business_detail = "/api/v1/businesses/{business_id}"
        if admin_business_detail not in paths:
            errors.append(f"{admin_business_detail} missing from OpenAPI")
        elif "patch" not in paths[admin_business_detail]:
            errors.append(f"PATCH {admin_business_detail} missing from OpenAPI")
        public_business = "/api/v1/public/b/{slug}"
        if public_business not in paths:
            errors.append(f"{public_business} missing from OpenAPI")
        elif "get" not in paths[public_business]:
            errors.append(f"GET {public_business} missing from OpenAPI")
        superadmin_businesses = "/api/v1/superadmin/businesses"
        if superadmin_businesses not in paths:
            errors.append(f"{superadmin_businesses} missing from OpenAPI")
        superadmin_business_detail = "/api/v1/superadmin/businesses/{business_id}"
        if superadmin_business_detail not in paths:
            errors.append(f"{superadmin_business_detail} missing from OpenAPI")
        superadmin_audit_logs = "/api/v1/superadmin/audit-logs"
        if superadmin_audit_logs not in paths:
            errors.append(f"{superadmin_audit_logs} missing from OpenAPI")
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
