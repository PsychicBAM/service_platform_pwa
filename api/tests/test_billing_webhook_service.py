"""Tests for Stripe webhook event handling (mocked, no network)."""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import SubscriptionPlan, SubscriptionStatus
from app.repositories.audit_log_repository import AuditLogRepository
from app.repositories.business_repository import BusinessRepository
from app.services.billing_service import BillingService
from tests.conftest import register_and_get_context


def checkout_completed_event(
    *,
    event_id: str = "evt_test_webhook_001",
    session_id: str = "cs_test_webhook_001",
    business_id: uuid.UUID,
    requested_plan: str = "business",
    user_id: uuid.UUID | None = None,
) -> dict:
    metadata = {
        "business_id": str(business_id),
        "requested_plan": requested_plan,
    }
    if user_id is not None:
        metadata["user_id"] = str(user_id)
    return {
        "id": event_id,
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": session_id,
                "metadata": metadata,
            },
        },
    }


async def _register_context(async_client, suffix: str) -> dict:
    return await register_and_get_context(async_client, suffix)


@pytest.mark.asyncio
async def test_checkout_completed_updates_subscription_plan(
    async_client,
    db_session: AsyncSession,
) -> None:
    ctx = await _register_context(async_client, "wh-plan")
    business_id = uuid.UUID(ctx["business_id"])
    user_id = uuid.UUID(ctx["user_id"])

    service = BillingService(db_session)
    event = checkout_completed_event(
        business_id=business_id,
        requested_plan="business",
        user_id=user_id,
    )
    result = await service.handle_stripe_webhook_event(event)

    assert result.processed is True
    assert result.ignored is False
    assert result.event_type == "checkout.session.completed"

    subscription = await BusinessRepository(db_session).get_subscription(business_id)
    assert subscription is not None
    assert subscription.plan == SubscriptionPlan.business
    assert subscription.status == SubscriptionStatus.active


@pytest.mark.asyncio
async def test_webhook_writes_audit_log_with_stripe_metadata(
    async_client,
    db_session: AsyncSession,
) -> None:
    ctx = await _register_context(async_client, "wh-audit")
    business_id = uuid.UUID(ctx["business_id"])

    event = checkout_completed_event(
        event_id="evt_audit_001",
        session_id="cs_audit_001",
        business_id=business_id,
        requested_plan="starter",
    )
    await BillingService(db_session).handle_stripe_webhook_event(event)

    logs = await AuditLogRepository(db_session).list_logs(business_id=business_id)
    plan_logs = [log for log in logs if log.action == "subscription.plan_changed"]
    assert len(plan_logs) == 1
    metadata = plan_logs[0].log_metadata
    assert metadata["old_plan"] == "free"
    assert metadata["new_plan"] == "starter"
    assert metadata["change_source"] == "stripe_webhook"
    assert metadata["stripe_event_id"] == "evt_audit_001"
    assert metadata["stripe_session_id"] == "cs_audit_001"
    assert metadata["business_id"] == str(business_id)
    assert metadata["requested_plan"] == "starter"


@pytest.mark.asyncio
async def test_duplicate_webhook_does_not_create_duplicate_audit(
    async_client,
    db_session: AsyncSession,
) -> None:
    ctx = await _register_context(async_client, "wh-dup")
    business_id = uuid.UUID(ctx["business_id"])
    event = checkout_completed_event(
        event_id="evt_dup_001",
        business_id=business_id,
        requested_plan="pro",
    )

    service = BillingService(db_session)
    first = await service.handle_stripe_webhook_event(event)
    second = await service.handle_stripe_webhook_event(event)

    assert first.processed is True
    assert second.processed is True
    assert second.ignored is True

    logs = await AuditLogRepository(db_session).list_logs(business_id=business_id)
    plan_logs = [log for log in logs if log.action == "subscription.plan_changed"]
    assert len(plan_logs) == 1


@pytest.mark.asyncio
async def test_same_plan_does_not_write_plan_change_audit(
    async_client,
    db_session: AsyncSession,
) -> None:
    ctx = await _register_context(async_client, "wh-same-plan")
    business_id = uuid.UUID(ctx["business_id"])
    repo = BusinessRepository(db_session)
    subscription = await repo.get_subscription(business_id)
    assert subscription is not None
    await repo.update_subscription(subscription, {"plan": SubscriptionPlan.business})

    event = checkout_completed_event(
        event_id="evt_same_plan_001",
        business_id=business_id,
        requested_plan="business",
    )
    result = await BillingService(db_session).handle_stripe_webhook_event(event)

    assert result.processed is True
    assert result.ignored is True

    logs = await AuditLogRepository(db_session).list_logs(business_id=business_id)
    plan_logs = [log for log in logs if log.action == "subscription.plan_changed"]
    assert plan_logs == []


@pytest.mark.asyncio
async def test_unsupported_event_is_ignored(
    db_session: AsyncSession,
) -> None:
    event = {
        "id": "evt_unsupported",
        "type": "invoice.payment_failed",
        "data": {"object": {}},
    }
    result = await BillingService(db_session).handle_stripe_webhook_event(event)

    assert result.processed is False
    assert result.ignored is True
    assert result.event_type == "invoice.payment_failed"


@pytest.mark.asyncio
async def test_invalid_requested_plan_is_ignored(
    async_client,
    db_session: AsyncSession,
) -> None:
    ctx = await _register_context(async_client, "wh-bad-plan")
    business_id = uuid.UUID(ctx["business_id"])
    repo = BusinessRepository(db_session)
    before = await repo.get_subscription(business_id)
    assert before is not None
    before_plan = before.plan

    event = checkout_completed_event(
        business_id=business_id,
        requested_plan="free",
    )
    result = await BillingService(db_session).handle_stripe_webhook_event(event)

    assert result.processed is False
    assert result.ignored is True

    after = await repo.get_subscription(business_id)
    assert after is not None
    assert after.plan == before_plan


@pytest.mark.asyncio
async def test_missing_business_id_metadata_is_ignored(
    async_client,
    db_session: AsyncSession,
) -> None:
    ctx = await _register_context(async_client, "wh-no-biz")
    business_id = uuid.UUID(ctx["business_id"])
    repo = BusinessRepository(db_session)
    before = await repo.get_subscription(business_id)
    assert before is not None
    before_plan = before.plan

    event = {
        "id": "evt_missing_biz",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_missing_biz",
                "metadata": {"requested_plan": "business"},
            },
        },
    }
    result = await BillingService(db_session).handle_stripe_webhook_event(event)

    assert result.processed is False
    assert result.ignored is True

    after = await repo.get_subscription(business_id)
    assert after is not None
    assert after.plan == before_plan
