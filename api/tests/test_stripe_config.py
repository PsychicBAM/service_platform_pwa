"""Tests for Stripe config helpers (no Stripe SDK)."""

from app.config import Settings
from app.models.enums import SubscriptionPlan
from app.services.stripe_config import (
    get_stripe_price_id_for_plan,
    stripe_price_ids_configured,
)


def test_free_plan_has_no_stripe_price_id() -> None:
    settings = Settings()
    assert get_stripe_price_id_for_plan(SubscriptionPlan.free, settings) is None


def test_paid_plan_price_mapping_when_configured() -> None:
    settings = Settings(
        stripe_price_starter="price_starter_001",
        stripe_price_business="price_business_001",
        stripe_price_pro="price_pro_001",
    )
    assert get_stripe_price_id_for_plan(SubscriptionPlan.starter, settings) == "price_starter_001"
    assert get_stripe_price_id_for_plan(SubscriptionPlan.business, settings) == "price_business_001"
    assert get_stripe_price_id_for_plan(SubscriptionPlan.pro, settings) == "price_pro_001"


def test_stripe_price_ids_configured_flags() -> None:
    settings = Settings(stripe_price_business="price_business_only")
    configured = stripe_price_ids_configured(settings)
    assert configured["business"] is True
    assert configured["starter"] is False
    assert configured["pro"] is False


def test_stripe_disabled_by_default() -> None:
    settings = Settings()
    assert settings.stripe_enabled is False


def test_free_plan_not_checkout_eligible() -> None:
    from app.services.stripe_config import is_checkout_eligible_plan

    assert is_checkout_eligible_plan(SubscriptionPlan.free) is False
    assert is_checkout_eligible_plan(SubscriptionPlan.business) is True
