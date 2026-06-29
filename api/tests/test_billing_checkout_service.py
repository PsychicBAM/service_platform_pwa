"""Tests for BillingService checkout session creation (mocked Stripe)."""

from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
import stripe
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.exceptions.billing import (
    InvalidCheckoutPlanError,
    StripeCheckoutCreateError,
    StripeDisabledError,
    StripePriceNotConfiguredError,
)
from app.models.enums import SubscriptionPlan
from app.repositories.business_repository import BusinessRepository
from app.services.billing_service import BillingService
from tests.conftest import register_and_get_context


@pytest.fixture
def enable_stripe(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("STRIPE_ENABLED", "true")
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_mock_secret_not_real")
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_mock_not_real")
    monkeypatch.setenv("STRIPE_PRICE_STARTER", "price_starter_test")
    monkeypatch.setenv("STRIPE_PRICE_BUSINESS", "price_business_test")
    monkeypatch.setenv("STRIPE_PRICE_PRO", "price_pro_test")
    monkeypatch.setenv(
        "STRIPE_SUCCESS_URL",
        "http://localhost:5173/billing/success",
    )
    monkeypatch.setenv("STRIPE_CANCEL_URL", "http://localhost:5173/billing/cancel")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def mock_stripe_session_create(monkeypatch: pytest.MonkeyPatch) -> MagicMock:
    mock = MagicMock(
        return_value=SimpleNamespace(
            url="https://checkout.stripe.com/c/pay/cs_test_mock123",
            id="cs_test_mock123",
        )
    )
    monkeypatch.setattr(stripe.checkout.Session, "create", mock)
    return mock


async def _register_business(async_client, suffix: str) -> dict:
    return await register_and_get_context(async_client, suffix)


async def _business_and_owner(db_session: AsyncSession, ctx: dict):
    repo = BusinessRepository(db_session)
    business_id = uuid.UUID(ctx["business_id"])
    business = await repo.get_by_id(business_id)
    user = await repo.get_owner_user(business_id)
    assert business is not None and user is not None
    return business, user


@pytest.mark.asyncio
async def test_stripe_disabled_blocks_checkout(
    async_client,
    db_session: AsyncSession,
) -> None:
    ctx = await _register_business(async_client, "billing-disabled")
    repo = BusinessRepository(db_session)
    business_id = uuid.UUID(ctx["business_id"])
    business = await repo.get_by_id(business_id)
    user = await repo.get_owner_user(business_id)
    assert business is not None and user is not None

    service = BillingService(db_session, settings=Settings(stripe_enabled=False))
    with pytest.raises(StripeDisabledError):
        await service.create_checkout_session(
            business=business,
            current_user=user,
            plan=SubscriptionPlan.business,
        )


@pytest.mark.asyncio
async def test_free_plan_rejected(
    async_client,
    db_session: AsyncSession,
    enable_stripe: None,
) -> None:
    ctx = await _register_business(async_client, "billing-free")
    business, user = await _business_and_owner(db_session, ctx)

    service = BillingService(db_session)
    with pytest.raises(InvalidCheckoutPlanError):
        await service.create_checkout_session(
            business=business,
            current_user=user,
            plan=SubscriptionPlan.free,
        )


@pytest.mark.asyncio
async def test_missing_price_id_returns_not_configured(
    async_client,
    db_session: AsyncSession,
    enable_stripe: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("STRIPE_PRICE_BUSINESS", "")
    get_settings.cache_clear()

    ctx = await _register_business(async_client, "billing-no-price")
    business, user = await _business_and_owner(db_session, ctx)

    service = BillingService(db_session)
    with pytest.raises(StripePriceNotConfiguredError):
        await service.create_checkout_session(
            business=business,
            current_user=user,
            plan=SubscriptionPlan.business,
        )


@pytest.mark.asyncio
async def test_valid_member_creates_checkout_session(
    async_client,
    db_session: AsyncSession,
    enable_stripe: None,
    mock_stripe_session_create: MagicMock,
) -> None:
    ctx = await _register_business(async_client, "billing-ok")
    business, user = await _business_and_owner(db_session, ctx)

    service = BillingService(db_session)
    result = await service.create_checkout_session(
        business=business,
        current_user=user,
        plan=SubscriptionPlan.business,
    )

    assert result.checkout_url.startswith("https://checkout.stripe.com/")
    assert result.session_id == "cs_test_mock123"
    mock_stripe_session_create.assert_called_once()


@pytest.mark.asyncio
async def test_checkout_session_uses_correct_price_id(
    async_client,
    db_session: AsyncSession,
    enable_stripe: None,
    mock_stripe_session_create: MagicMock,
) -> None:
    ctx = await _register_business(async_client, "billing-price")
    business, user = await _business_and_owner(db_session, ctx)

    await BillingService(db_session).create_checkout_session(
        business=business,
        current_user=user,
        plan=SubscriptionPlan.starter,
    )

    kwargs = mock_stripe_session_create.call_args.kwargs
    assert kwargs["line_items"] == [{"price": "price_starter_test", "quantity": 1}]


@pytest.mark.asyncio
async def test_checkout_session_metadata_includes_context(
    async_client,
    db_session: AsyncSession,
    enable_stripe: None,
    mock_stripe_session_create: MagicMock,
) -> None:
    ctx = await _register_business(async_client, "billing-meta")
    business, user = await _business_and_owner(db_session, ctx)

    await BillingService(db_session).create_checkout_session(
        business=business,
        current_user=user,
        plan=SubscriptionPlan.pro,
    )

    kwargs = mock_stripe_session_create.call_args.kwargs
    assert kwargs["metadata"] == {
        "business_id": str(business.id),
        "requested_plan": "pro",
        "user_id": str(user.id),
    }
    assert kwargs["client_reference_id"] == str(business.id)


@pytest.mark.asyncio
async def test_subscription_plan_unchanged_after_checkout(
    async_client,
    db_session: AsyncSession,
    enable_stripe: None,
    mock_stripe_session_create: MagicMock,
) -> None:
    ctx = await _register_business(async_client, "billing-no-plan-change")
    business, user = await _business_and_owner(db_session, ctx)
    repo = BusinessRepository(db_session)

    before = await repo.get_subscription(business.id)
    assert before is not None
    before_plan = before.plan

    await BillingService(db_session).create_checkout_session(
        business=business,
        current_user=user,
        plan=SubscriptionPlan.business,
    )

    after = await repo.get_subscription(business.id)
    assert after is not None
    assert after.plan == before_plan


@pytest.mark.asyncio
async def test_stripe_exception_returns_checkout_create_failed(
    async_client,
    db_session: AsyncSession,
    enable_stripe: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def _raise_stripe_error(**_kwargs: object) -> None:
        raise stripe.StripeError("mock stripe failure")

    monkeypatch.setattr(stripe.checkout.Session, "create", _raise_stripe_error)

    ctx = await _register_business(async_client, "billing-stripe-err")
    business, user = await _business_and_owner(db_session, ctx)

    with pytest.raises(StripeCheckoutCreateError):
        await BillingService(db_session).create_checkout_session(
            business=business,
            current_user=user,
            plan=SubscriptionPlan.business,
        )
