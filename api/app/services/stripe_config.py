"""Stripe configuration helpers — no Stripe API calls or SDK required."""

from __future__ import annotations

from app.config import Settings
from app.models.enums import SubscriptionPlan

PAID_SUBSCRIPTION_PLANS: frozenset[SubscriptionPlan] = frozenset(
    {
        SubscriptionPlan.starter,
        SubscriptionPlan.business,
        SubscriptionPlan.pro,
    }
)


def get_stripe_price_id_for_plan(
    plan: SubscriptionPlan,
    settings: Settings,
) -> str | None:
    """Return configured Stripe price ID for a plan, or None for Free / unset."""
    if not is_checkout_eligible_plan(plan):
        return None

    mapping: dict[SubscriptionPlan, str | None] = {
        SubscriptionPlan.starter: settings.stripe_price_starter,
        SubscriptionPlan.business: settings.stripe_price_business,
        SubscriptionPlan.pro: settings.stripe_price_pro,
    }
    raw = mapping.get(plan)
    if not raw:
        return None
    value = raw.strip()
    return value or None


def is_checkout_eligible_plan(plan: SubscriptionPlan) -> bool:
    """Paid plans only — Free cannot use Stripe Checkout."""
    return plan in PAID_SUBSCRIPTION_PLANS


def stripe_price_ids_configured(settings: Settings) -> dict[str, bool]:
    """Report whether each paid plan has a price ID (values are not returned)."""
    return {
        plan.value: get_stripe_price_id_for_plan(plan, settings) is not None
        for plan in sorted(PAID_SUBSCRIPTION_PLANS, key=lambda p: p.value)
    }
