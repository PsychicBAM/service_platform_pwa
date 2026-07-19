import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import (
    PlanChangeDirection,
    PlanChangeRequestStatus,
    SubscriptionPlan,
    UserRole,
)
from app.models.plan_change_request import PlanChangeRequest
from app.models.subscription import Subscription
from app.models.user import User
from tests.conftest import register_and_get_context


async def _promote_superadmin(db_session: AsyncSession, user_id: str) -> None:
    await db_session.execute(
        update(User).where(User.id == uuid.UUID(user_id)).values(role=UserRole.superadmin)
    )
    await db_session.commit()


async def _set_plan(
    db_session: AsyncSession,
    business_id: str,
    plan: SubscriptionPlan,
) -> None:
    await db_session.execute(
        update(Subscription)
        .where(Subscription.business_id == uuid.UUID(business_id))
        .values(plan=plan)
    )
    await db_session.commit()


@pytest.mark.asyncio
async def test_owner_creates_plan_change_request(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    ctx = await register_and_get_context(async_client, "pcr-create")

    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/plan-change-requests",
        headers=ctx["headers"],
        json={"requested_plan": "starter"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["current_plan"] == "free"
    assert body["requested_plan"] == "starter"
    assert body["direction"] == "upgrade"
    assert body["status"] == "pending"
    assert body["business_id"] == ctx["business_id"]

    result = await db_session.execute(
        select(PlanChangeRequest).where(
            PlanChangeRequest.business_id == uuid.UUID(ctx["business_id"])
        )
    )
    row = result.scalar_one()
    assert row.status == PlanChangeRequestStatus.pending
    assert row.requested_plan == SubscriptionPlan.starter
    assert row.direction == PlanChangeDirection.upgrade


@pytest.mark.asyncio
async def test_cannot_request_current_plan(
    async_client: AsyncClient,
) -> None:
    ctx = await register_and_get_context(async_client, "pcr-same")

    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/plan-change-requests",
        headers=ctx["headers"],
        json={"requested_plan": "free"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_PLAN_CHANGE_REQUEST"


@pytest.mark.asyncio
async def test_invalid_plan_rejected(async_client: AsyncClient) -> None:
    ctx = await register_and_get_context(async_client, "pcr-invalid")

    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/plan-change-requests",
        headers=ctx["headers"],
        json={"requested_plan": "enterprise"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_duplicate_pending_updates_same_row(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    ctx = await register_and_get_context(async_client, "pcr-dup")

    first = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/plan-change-requests",
        headers=ctx["headers"],
        json={"requested_plan": "starter"},
    )
    assert first.status_code == 200
    first_id = first.json()["id"]

    second = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/plan-change-requests",
        headers=ctx["headers"],
        json={"requested_plan": "business"},
    )
    assert second.status_code == 200
    assert second.json()["id"] == first_id
    assert second.json()["requested_plan"] == "business"
    assert second.json()["direction"] == "upgrade"

    result = await db_session.execute(
        select(PlanChangeRequest).where(
            PlanChangeRequest.business_id == uuid.UUID(ctx["business_id"]),
            PlanChangeRequest.status == PlanChangeRequestStatus.pending,
        )
    )
    rows = result.scalars().all()
    assert len(rows) == 1
    assert rows[0].requested_plan == SubscriptionPlan.business


@pytest.mark.asyncio
async def test_superadmin_lists_pending_requests(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    ctx = await register_and_get_context(async_client, "pcr-list")
    await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/plan-change-requests",
        headers=ctx["headers"],
        json={"requested_plan": "pro"},
    )
    await _promote_superadmin(db_session, ctx["user_id"])

    response = await async_client.get(
        "/api/v1/superadmin/plan-change-requests",
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["meta"]["total"] >= 1
    match = next(
        item for item in body["data"] if item["business_id"] == ctx["business_id"]
    )
    assert match["requested_plan"] == "pro"
    assert match["status"] == "pending"
    assert match["business_name"]


@pytest.mark.asyncio
async def test_superadmin_approve_updates_plan(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    ctx = await register_and_get_context(async_client, "pcr-approve")
    create = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/plan-change-requests",
        headers=ctx["headers"],
        json={"requested_plan": "business"},
    )
    request_id = create.json()["id"]
    await _promote_superadmin(db_session, ctx["user_id"])

    response = await async_client.post(
        f"/api/v1/superadmin/plan-change-requests/{request_id}/approve",
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["request"]["status"] == "approved"
    assert body["business_plan"] == "business"

    sub = (
        await db_session.execute(
            select(Subscription).where(
                Subscription.business_id == uuid.UUID(ctx["business_id"])
            )
        )
    ).scalar_one()
    assert sub.plan == SubscriptionPlan.business


@pytest.mark.asyncio
async def test_superadmin_reject_keeps_plan(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    ctx = await register_and_get_context(async_client, "pcr-reject")
    await _set_plan(db_session, ctx["business_id"], SubscriptionPlan.starter)
    create = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/plan-change-requests",
        headers=ctx["headers"],
        json={"requested_plan": "free"},
    )
    request_id = create.json()["id"]
    assert create.json()["direction"] == "downgrade"
    await _promote_superadmin(db_session, ctx["user_id"])

    response = await async_client.post(
        f"/api/v1/superadmin/plan-change-requests/{request_id}/reject",
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["request"]["status"] == "rejected"
    assert body["business_plan"] == "starter"

    sub = (
        await db_session.execute(
            select(Subscription).where(
                Subscription.business_id == uuid.UUID(ctx["business_id"])
            )
        )
    ).scalar_one()
    assert sub.plan == SubscriptionPlan.starter
