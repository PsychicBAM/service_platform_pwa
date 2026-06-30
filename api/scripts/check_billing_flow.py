#!/usr/bin/env python3
"""Billing / Stripe flow smoke audit — wiring only, no real Stripe calls or payments."""

from __future__ import annotations

import sys
from pathlib import Path

api_dir = Path(__file__).resolve().parents[1]
if str(api_dir) not in sys.path:
    sys.path.insert(0, str(api_dir))

NO_REAL_STRIPE = "No real Stripe API calls or payments are made during this audit."

CHECKOUT_PATH = "/api/v1/businesses/{business_id}/billing/checkout-session"
WEBHOOK_PATH = "/api/v1/billing/stripe/webhook"


def _record(name: str, *, status: str) -> dict[str, str]:
    return {"name": name, "status": status}


def run_audit() -> int:
    results: list[dict[str, str]] = []
    critical_failures: list[str] = []

    print("Billing / Stripe flow smoke audit")
    print(NO_REAL_STRIPE)
    print()

    print("==> Importing app.main ...")
    try:
        import app.main  # noqa: F401

        results.append(_record("import app.main", status="PASS"))
    except Exception as exc:
        results.append(_record("import app.main", status="FAIL"))
        critical_failures.append("import app.main failed")

    print("==> Importing billing modules ...")
    try:
        import app.routers.billing  # noqa: F401
        import app.schemas.billing  # noqa: F401
        import app.services.billing_service  # noqa: F401
        import app.services.stripe_config  # noqa: F401

        results.append(_record("import billing router/service/schemas", status="PASS"))
    except Exception as exc:
        results.append(_record("import billing router/service/schemas", status="FAIL"))
        critical_failures.append("import billing modules failed")
        return _print_summary(results, critical_failures)

    print("==> Importing stripe_config helper ...")
    try:
        from app.services.stripe_config import (
            PAID_SUBSCRIPTION_PLANS,
            get_stripe_price_id_for_plan,
            is_checkout_eligible_plan,
            stripe_price_ids_configured,
        )

        results.append(_record("import stripe_config helper", status="PASS"))
    except Exception as exc:
        results.append(_record("import stripe_config helper", status="FAIL"))
        critical_failures.append("import stripe_config failed")
        return _print_summary(results, critical_failures)

    print("==> Checking OpenAPI billing endpoints ...")
    try:
        from app.main import app

        paths = app.openapi()["paths"]
        if CHECKOUT_PATH not in paths or "post" not in paths[CHECKOUT_PATH]:
            raise ValueError(f"POST {CHECKOUT_PATH} missing from OpenAPI")
        if WEBHOOK_PATH not in paths or "post" not in paths[WEBHOOK_PATH]:
            raise ValueError(f"POST {WEBHOOK_PATH} missing from OpenAPI")

        print(f"    checkout endpoint: POST {CHECKOUT_PATH}")
        print(f"    webhook endpoint: POST {WEBHOOK_PATH}")
        results.append(_record("checkout endpoint in OpenAPI", status="PASS"))
        results.append(_record("webhook endpoint in OpenAPI", status="PASS"))
    except Exception:
        results.append(_record("OpenAPI billing endpoints", status="FAIL"))
        critical_failures.append("OpenAPI billing endpoints check failed")

    print("==> Checking Stripe config defaults ...")
    try:
        from app.config import Settings
        from app.models.enums import SubscriptionPlan

        settings = Settings()
        print(f"    STRIPE_ENABLED={settings.stripe_enabled}")
        print(
            "    Stripe secrets are checked by production env validation; "
            "values are not inspected or printed here."
        )

        if settings.stripe_enabled:
            results.append(_record("STRIPE_ENABLED default", status="WARN"))
        else:
            results.append(_record("STRIPE_ENABLED default", status="PASS"))

        paid_plan_keys = {"starter", "business", "pro"}
        configured = stripe_price_ids_configured(settings)
        if set(configured.keys()) != paid_plan_keys:
            raise ValueError("unexpected paid plan price config keys")

        for plan_id in sorted(paid_plan_keys):
            price_configured = configured[plan_id]
            status = "configured" if price_configured else "not set"
            print(f"    STRIPE price for {plan_id}: {status}")

        results.append(_record("paid plan config keys", status="PASS"))

        if is_checkout_eligible_plan(SubscriptionPlan.free):
            raise ValueError("free plan must not be checkout eligible")
        if not all(is_checkout_eligible_plan(p) for p in PAID_SUBSCRIPTION_PLANS):
            raise ValueError("starter/business/pro must be checkout eligible")

        free_price = get_stripe_price_id_for_plan(SubscriptionPlan.free, settings)
        if free_price is not None:
            raise ValueError("free plan must not resolve a Stripe price ID")

        results.append(_record("free plan checkout eligibility", status="PASS"))
    except Exception:
        results.append(_record("Stripe config defaults", status="FAIL"))
        critical_failures.append("Stripe config defaults check failed")

    print("==> Checking billing readiness script exists ...")
    readiness_script = api_dir / "scripts" / "check_billing_readiness.py"
    if readiness_script.is_file():
        print(f"    Found {readiness_script.name}")
        results.append(_record("check_billing_readiness.py exists", status="PASS"))
    else:
        results.append(_record("check_billing_readiness.py exists", status="FAIL"))
        critical_failures.append("check_billing_readiness.py missing")

    return _print_summary(results, critical_failures)


def _print_summary(results: list[dict[str, str]], critical_failures: list[str]) -> int:
    print()
    print("==> Summary")
    for item in results:
        print(f"  [{item['status']}] {item['name']}")

    pass_count = sum(1 for r in results if r["status"] == "PASS")
    warn_count = sum(1 for r in results if r["status"] == "WARN")
    fail_count = sum(1 for r in results if r["status"] == "FAIL")

    print()
    print(f"PASS: {pass_count}  WARN: {warn_count}  FAIL: {fail_count}")
    print(NO_REAL_STRIPE)

    if critical_failures:
        print("\nCritical failures:")
        for failure in critical_failures:
            print(f"  - {failure}")
        return 1

    print("\nBilling flow smoke audit passed.")
    return 0


def main() -> int:
    return run_audit()


if __name__ == "__main__":
    raise SystemExit(main())
