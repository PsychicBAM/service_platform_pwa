"""Tests for Stripe webhook API route (mocked Stripe, no network)."""

from __future__ import annotations

import uuid

import pytest
import stripe
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.main import app
from app.models.enums import SubscriptionPlan
from app.repositories.audit_log_repository import AuditLogRepository
from app.repositories.business_repository import BusinessRepository
from tests.conftest import register_and_get_context
from tests.test_billing_webhook_service import checkout_completed_event

WEBHOOK_URL = "/api/v1/billing/stripe/webhook"


@pytest.fixture
def enable_stripe(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("STRIPE_ENABLED", "true")
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_mock_secret_not_real")
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_mock_not_real")
    monkeypatch.setenv("STRIPE_PRICE_STARTER", "price_starter_test")
    monkeypatch.setenv("STRIPE_PRICE_BUSINESS", "price_business_test")
    monkeypatch.setenv("STRIPE_PRICE_PRO", "price_pro_test")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_openapi_includes_webhook_endpoint() -> None:
    paths = app.openapi()["paths"]
    assert WEBHOOK_URL in paths
    assert "post" in paths[WEBHOOK_URL]


@pytest.mark.asyncio
async def test_webhook_disabled_when_stripe_not_enabled(
    async_client: AsyncClient,
) -> None:
    response = await async_client.post(
        WEBHOOK_URL,
        content=b"{}",
        headers={"stripe-signature": "t=1,v1=test"},
    )
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "STRIPE_WEBHOOK_DISABLED"


@pytest.mark.asyncio
async def test_webhook_missing_signature_returns_400(
    async_client: AsyncClient,
    enable_stripe: None,
) -> None:
    response = await async_client.post(WEBHOOK_URL, content=b"{}")
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "STRIPE_WEBHOOK_SIGNATURE_INVALID"


@pytest.mark.asyncio
async def test_webhook_invalid_signature_returns_400(
    async_client: AsyncClient,
    enable_stripe: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def _raise_invalid(*_args: object, **_kwargs: object) -> None:
        raise stripe.SignatureVerificationError("invalid signature", sig_header="bad")

    monkeypatch.setattr(stripe.Webhook, "construct_event", _raise_invalid)

    response = await async_client.post(
        WEBHOOK_URL,
        content=b"{}",
        headers={"stripe-signature": "t=1,v1=invalid"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "STRIPE_WEBHOOK_SIGNATURE_INVALID"


@pytest.mark.asyncio
async def test_webhook_checkout_completed_updates_plan(
    async_client: AsyncClient,
    db_session: AsyncSession,
    enable_stripe: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    ctx = await register_and_get_context(async_client, "wh-route-plan")
    business_id = uuid.UUID(ctx["business_id"])
    event = checkout_completed_event(
        business_id=business_id,
        requested_plan="business",
        user_id=uuid.UUID(ctx["user_id"]),
    )

    monkeypatch.setattr(
        stripe.Webhook,
        "construct_event",
        lambda *_args, **_kwargs: event,
    )

    response = await async_client.post(
        WEBHOOK_URL,
        content=b'{"mock": true}',
        headers={"stripe-signature": "t=1,v1=mock"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["processed"] is True
    assert body["event_type"] == "checkout.session.completed"

    subscription = await BusinessRepository(db_session).get_subscription(business_id)
    assert subscription is not None
    assert subscription.plan == SubscriptionPlan.business


@pytest.mark.asyncio
async def test_webhook_unsupported_event_ignored(
    async_client: AsyncClient,
    enable_stripe: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    event = {
        "id": "evt_route_unsupported",
        "type": "customer.subscription.deleted",
        "data": {"object": {}},
    }
    monkeypatch.setattr(
        stripe.Webhook,
        "construct_event",
        lambda *_args, **_kwargs: event,
    )

    response = await async_client.post(
        WEBHOOK_URL,
        content=b"{}",
        headers={"stripe-signature": "t=1,v1=mock"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["processed"] is False
    assert body["ignored"] is True


@pytest.mark.asyncio
async def test_webhook_route_writes_audit_log(
    async_client: AsyncClient,
    db_session: AsyncSession,
    enable_stripe: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    ctx = await register_and_get_context(async_client, "wh-route-audit")
    business_id = uuid.UUID(ctx["business_id"])
    event = checkout_completed_event(
        event_id="evt_route_audit",
        business_id=business_id,
        requested_plan="starter",
    )
    monkeypatch.setattr(
        stripe.Webhook,
        "construct_event",
        lambda *_args, **_kwargs: event,
    )

    response = await async_client.post(
        WEBHOOK_URL,
        content=b"{}",
        headers={"stripe-signature": "t=1,v1=mock"},
    )
    assert response.status_code == 200

    logs = await AuditLogRepository(db_session).list_logs(business_id=business_id)
    plan_logs = [log for log in logs if log.action == "subscription.plan_changed"]
    assert len(plan_logs) == 1
    assert plan_logs[0].log_metadata["change_source"] == "stripe_webhook"
