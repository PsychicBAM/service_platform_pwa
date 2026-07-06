"""Public page display variant — safe hint for frontend layout only."""

from __future__ import annotations

from typing import Protocol

from app.models.enums import PublicPageVariant, SubscriptionPlan, SubscriptionStatus


class SubscriptionPlanStatus(Protocol):
    plan: SubscriptionPlan
    status: SubscriptionStatus


def resolve_public_page_variant(subscription: SubscriptionPlanStatus | None) -> PublicPageVariant:
    """Return mini_site only for active Pro subscriptions; standard otherwise."""
    if subscription is None:
        return PublicPageVariant.standard
    if (
        subscription.plan == SubscriptionPlan.pro
        and subscription.status == SubscriptionStatus.active
    ):
        return PublicPageVariant.mini_site
    return PublicPageVariant.standard
