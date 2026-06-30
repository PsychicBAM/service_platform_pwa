#!/usr/bin/env python3
"""Billing readiness checkpoint — plan enum and Stripe config status (no API calls)."""

from __future__ import annotations

import sys
from pathlib import Path


def _secret_status(label: str, *, is_set: bool) -> str:
    """Report whether a secret is configured without printing its value."""
    if is_set:
        return f"{label}: configured"
    return f"{label}: not set"


def main() -> int:
    api_dir = Path(__file__).resolve().parents[1]
    project_root = api_dir.parent

    errors: list[str] = []
    print("Billing readiness checkpoint")
    print("Checkout session + webhook backend when STRIPE_ENABLED=true; admin checkout UI in Settings.\n")

    sys.path.insert(0, str(api_dir))
    try:
        from app.config import Settings
        from app.models.enums import SubscriptionPlan
        from app.services.stripe_config import stripe_price_ids_configured
    except Exception as exc:  # pragma: no cover
        print(f"FAIL: could not import billing modules: {exc}")
        return 1

    plans = [p.value for p in SubscriptionPlan]
    print(f"SubscriptionPlan enum values: {', '.join(plans)}")
    expected = {"free", "starter", "business", "pro"}
    if set(plans) != expected:
        errors.append(f"unexpected SubscriptionPlan values: {plans}")

    settings = Settings()
    print(f"STRIPE_ENABLED={settings.stripe_enabled}")
    print(_secret_status("STRIPE_SECRET_KEY", is_set=bool(settings.stripe_secret_key and settings.stripe_secret_key.strip())))
    print(_secret_status("STRIPE_WEBHOOK_SECRET", is_set=bool(settings.stripe_webhook_secret and settings.stripe_webhook_secret.strip())))

    if not settings.stripe_enabled:
        print("Stripe disabled — billing remains manual/demo.")
    else:
        configured = stripe_price_ids_configured(settings)
        for plan_id, is_set in configured.items():
            status = "configured" if is_set else "missing"
            print(f"STRIPE price for {plan_id}: {status}")
        missing_prices = [plan_id for plan_id, ok in configured.items() if not ok]
        if missing_prices:
            errors.append(
                "STRIPE_ENABLED=true but price IDs missing for: "
                + ", ".join(missing_prices)
            )
        if not (settings.stripe_secret_key or "").strip():
            errors.append("STRIPE_ENABLED=true but STRIPE_SECRET_KEY is not set")
        if not (settings.stripe_webhook_secret or "").strip():
            errors.append("STRIPE_ENABLED=true but STRIPE_WEBHOOK_SECRET is not set")

    report_candidates = [
        project_root / "BILLING_READINESS_REPORT.md",
        Path.cwd() / "BILLING_READINESS_REPORT.md",
    ]
    report = next((path for path in report_candidates if path.is_file()), None)
    if report:
        print(f"Report: found {report.name}")
    else:
        print(
            "WARN: BILLING_READINESS_REPORT.md not found from api/ "
            "(expected at project root on host; optional in Docker api-only image)"
        )

    if errors:
        print("\nFAILED:")
        for err in errors:
            print(f"  - {err}")
        return 1

    print("\nBilling readiness checkpoint passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
