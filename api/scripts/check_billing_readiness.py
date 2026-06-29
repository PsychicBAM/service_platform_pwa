#!/usr/bin/env python3
"""Billing readiness checkpoint — verifies plan enum and that Stripe is not required yet."""

from __future__ import annotations

import os
import sys
from pathlib import Path


def main() -> int:
    api_dir = Path(__file__).resolve().parents[1]
    project_root = api_dir.parent

    errors: list[str] = []
    print("Billing readiness checkpoint")
    print("Stripe/checkout are not implemented — this script only verifies prerequisites.\n")

    sys.path.insert(0, str(api_dir))
    try:
        from app.models.enums import SubscriptionPlan
    except Exception as exc:  # pragma: no cover
        print(f"FAIL: could not import SubscriptionPlan: {exc}")
        return 1

    plans = [p.value for p in SubscriptionPlan]
    print(f"SubscriptionPlan enum values: {', '.join(plans)}")
    expected = {"free", "starter", "business", "pro"}
    if set(plans) != expected:
        errors.append(f"unexpected SubscriptionPlan values: {plans}")

    stripe_secret = os.environ.get("STRIPE_SECRET_KEY", "").strip()
    stripe_webhook = os.environ.get("STRIPE_WEBHOOK_SECRET", "").strip()
    if stripe_secret or stripe_webhook:
        print("WARN: STRIPE_* env vars are set but Stripe integration is not implemented yet.")
    else:
        print("Stripe env: not configured (expected for current MVP)")

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
