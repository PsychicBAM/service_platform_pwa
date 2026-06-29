"""Tests for billing checkout session API routes (mocked Stripe)."""

from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
import stripe
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.main import app
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
            url="https://checkout.stripe.com/c/pay/cs_test_route123",
            id="cs_test_route123",
        )
    )
    monkeypatch.setattr(stripe.checkout.Session, "create", mock)
    return mock


def _checkout_url(business_id: str) -> str:
    return f"/api/v1/businesses/{business_id}/billing/checkout-session"


@pytest.mark.asyncio
async def test_route_stripe_disabled_returns_stripe_disabled(
    async_client: AsyncClient,
) -> None:
    ctx = await register_and_get_context(async_client, "route-disabled")
    response = await async_client.post(
        _checkout_url(ctx["business_id"]),
        headers=ctx["headers"],
        json={"plan": "business"},
    )
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "STRIPE_DISABLED"


@pytest.mark.asyncio
async def test_route_free_plan_rejected_by_schema(
    async_client: AsyncClient,
    enable_stripe: None,
) -> None:
    ctx = await register_and_get_context(async_client, "route-free")
    response = await async_client.post(
        _checkout_url(ctx["business_id"]),
        headers=ctx["headers"],
        json={"plan": "free"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_route_missing_price_id_returns_not_configured(
    async_client: AsyncClient,
    enable_stripe: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("STRIPE_PRICE_BUSINESS", "")
    get_settings.cache_clear()

    ctx = await register_and_get_context(async_client, "route-no-price")
    response = await async_client.post(
        _checkout_url(ctx["business_id"]),
        headers=ctx["headers"],
        json={"plan": "business"},
    )
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "STRIPE_PRICE_NOT_CONFIGURED"


@pytest.mark.asyncio
async def test_route_member_can_create_checkout_session(
    async_client: AsyncClient,
    enable_stripe: None,
    mock_stripe_session_create: MagicMock,
) -> None:
    ctx = await register_and_get_context(async_client, "route-ok")
    response = await async_client.post(
        _checkout_url(ctx["business_id"]),
        headers=ctx["headers"],
        json={"plan": "business"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["checkout_url"].startswith("https://checkout.stripe.com/")
    assert body["session_id"] == "cs_test_route123"
    mock_stripe_session_create.assert_called_once()


@pytest.mark.asyncio
async def test_route_non_member_forbidden(
    async_client: AsyncClient,
    enable_stripe: None,
    mock_stripe_session_create: MagicMock,
) -> None:
    owner_ctx = await register_and_get_context(async_client, "route-owner")
    other_ctx = await register_and_get_context(async_client, "route-other")

    response = await async_client.post(
        _checkout_url(owner_ctx["business_id"]),
        headers=other_ctx["headers"],
        json={"plan": "business"},
    )
    assert response.status_code == 403
    mock_stripe_session_create.assert_not_called()


@pytest.mark.asyncio
async def test_route_stripe_exception_returns_checkout_failed(
    async_client: AsyncClient,
    enable_stripe: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def _raise_stripe_error(**_kwargs: object) -> None:
        raise stripe.StripeError("mock stripe failure")

    monkeypatch.setattr(stripe.checkout.Session, "create", _raise_stripe_error)

    ctx = await register_and_get_context(async_client, "route-stripe-err")
    response = await async_client.post(
        _checkout_url(ctx["business_id"]),
        headers=ctx["headers"],
        json={"plan": "business"},
    )
    assert response.status_code == 502
    assert response.json()["error"]["code"] == "STRIPE_CHECKOUT_CREATE_FAILED"


@pytest.mark.asyncio
async def test_route_requires_auth(async_client: AsyncClient) -> None:
    ctx = await register_and_get_context(async_client, "route-auth")
    response = await async_client.post(
        _checkout_url(ctx["business_id"]),
        json={"plan": "business"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_openapi_includes_checkout_endpoint() -> None:
    paths = app.openapi()["paths"]
    path = "/api/v1/businesses/{business_id}/billing/checkout-session"
    assert path in paths
    assert "post" in paths[path]


@pytest.mark.asyncio
async def test_route_subscription_plan_unchanged(
    async_client: AsyncClient,
    db_session: AsyncSession,
    enable_stripe: None,
    mock_stripe_session_create: MagicMock,
) -> None:
    from app.repositories.business_repository import BusinessRepository

    ctx = await register_and_get_context(async_client, "route-plan-unchanged")
    repo = BusinessRepository(db_session)
    business_id = uuid.UUID(ctx["business_id"])
    before = await repo.get_subscription(business_id)
    assert before is not None
    before_plan = before.plan

    response = await async_client.post(
        _checkout_url(ctx["business_id"]),
        headers=ctx["headers"],
        json={"plan": "business"},
    )
    assert response.status_code == 200

    after = await repo.get_subscription(business_id)
    assert after is not None
    assert after.plan == before_plan
