"""Public page display variant — preference + plan-safe resolution."""

from __future__ import annotations

from typing import Any, Protocol

from app.models.enums import PublicPageVariant, SubscriptionPlan, SubscriptionStatus

# Persisted at Business.settings["public_page_variant"] when the owner chooses
# Default business profile (standard) or a mini-site template (mini_site).
# Absent key = legacy auto behavior for eligible plans.
PUBLIC_PAGE_VARIANT_SETTINGS_KEY = "public_page_variant"


class SubscriptionPlanStatus(Protocol):
    plan: SubscriptionPlan
    status: SubscriptionStatus


def can_use_mini_site_variant(subscription: SubscriptionPlanStatus | None) -> bool:
    """Active Business or Pro may publish the mini-site layout."""
    if subscription is None:
        return False
    if subscription.status != SubscriptionStatus.active:
        return False
    return subscription.plan in (SubscriptionPlan.pro, SubscriptionPlan.business)


def read_public_page_variant_preference(
    settings: dict[str, Any] | None,
) -> PublicPageVariant | None:
    if not isinstance(settings, dict):
        return None
    raw = settings.get(PUBLIC_PAGE_VARIANT_SETTINGS_KEY)
    if raw is None:
        return None
    try:
        return PublicPageVariant(str(raw).strip().lower())
    except ValueError:
        return None


def set_public_page_variant_preference(
    settings: dict[str, Any] | None,
    variant: PublicPageVariant,
) -> dict[str, Any]:
    merged = dict(settings or {})
    merged[PUBLIC_PAGE_VARIANT_SETTINGS_KEY] = variant.value
    return merged


def resolve_public_page_variant(
    subscription: SubscriptionPlanStatus | None,
    settings: dict[str, Any] | None = None,
) -> PublicPageVariant:
    """
    Resolve public layout.

    - Explicit standard preference always wins (Default business profile).
    - Explicit mini_site preference wins only when the plan may publish mini-site.
    - Unset preference keeps legacy behavior: mini_site for active Business/Pro.
    """
    preference = read_public_page_variant_preference(settings)
    can_mini = can_use_mini_site_variant(subscription)

    if preference == PublicPageVariant.standard:
        return PublicPageVariant.standard
    if preference == PublicPageVariant.mini_site:
        return PublicPageVariant.mini_site if can_mini else PublicPageVariant.standard
    return PublicPageVariant.mini_site if can_mini else PublicPageVariant.standard
