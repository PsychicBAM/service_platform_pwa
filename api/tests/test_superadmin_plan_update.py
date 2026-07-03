import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.enums import SubscriptionPlan, UserRole
from app.models.subscription import Subscription
from app.models.user import User
from tests.conftest import register_and_get_context, register_payload


async def _promote_superadmin(db_session: AsyncSession, user_id: str) -> None:
    await db_session.execute(
        update(User).where(User.id == uuid.UUID(user_id)).values(role=UserRole.superadmin)
    )
    await db_session.commit()


@pytest.mark.asyncio
async def test_superadmin_can_change_plan_business_to_pro(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    ctx = await register_and_get_context(async_client, "sa-plan-b2p")
    await _promote_superadmin(db_session, ctx["user_id"])

    await async_client.patch(
        f"/api/v1/superadmin/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
        json={"plan": "business"},
    )

    response = await async_client.patch(
        f"/api/v1/superadmin/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
        json={"plan": "pro"},
    )
    assert response.status_code == 200
    assert response.json()["subscription"]["plan"] == "pro"


@pytest.mark.asyncio
async def test_plan_change_persists_in_fresh_db_session(
    async_client: AsyncClient,
    db_session: AsyncSession,
    db_engine,
) -> None:
    ctx = await register_and_get_context(async_client, "sa-plan-fresh")
    await _promote_superadmin(db_session, ctx["user_id"])

    patch = await async_client.patch(
        f"/api/v1/superadmin/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
        json={"plan": "pro"},
    )
    assert patch.status_code == 200

    factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as fresh_session:
        result = await fresh_session.execute(
            select(Subscription).where(
                Subscription.business_id == uuid.UUID(ctx["business_id"])
            )
        )
        subscription = result.scalar_one()
        assert subscription.plan == SubscriptionPlan.pro


@pytest.mark.asyncio
async def test_plan_change_visible_on_detail_after_update(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    ctx = await register_and_get_context(async_client, "sa-plan-detail")
    await _promote_superadmin(db_session, ctx["user_id"])

    await async_client.patch(
        f"/api/v1/superadmin/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
        json={"plan": "pro"},
    )

    detail = await async_client.get(
        f"/api/v1/superadmin/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
    )
    assert detail.status_code == 200
    assert detail.json()["subscription"]["plan"] == "pro"


@pytest.mark.asyncio
async def test_plan_change_visible_on_list_after_update(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    ctx = await register_and_get_context(async_client, "sa-plan-list")
    await _promote_superadmin(db_session, ctx["user_id"])

    await async_client.patch(
        f"/api/v1/superadmin/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
        json={"plan": "pro"},
    )

    listing = await async_client.get(
        "/api/v1/superadmin/businesses",
        params={"plan": "pro"},
        headers=ctx["headers"],
    )
    assert listing.status_code == 200
    ids = {row["id"] for row in listing.json()["data"]}
    assert ctx["business_id"] in ids
    item = next(row for row in listing.json()["data"] if row["id"] == ctx["business_id"])
    assert item["plan"] == "pro"


@pytest.mark.asyncio
async def test_owner_cannot_use_superadmin_plan_update(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    owner_ctx = await register_and_get_context(async_client, "sa-plan-owner-deny")
    other_ctx = await register_and_get_context(async_client, "sa-plan-other-biz")

    response = await async_client.patch(
        f"/api/v1/superadmin/businesses/{other_ctx['business_id']}",
        headers=owner_ctx["headers"],
        json={"plan": "pro"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_invalid_plan_value_rejected(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    ctx = await register_and_get_context(async_client, "sa-plan-invalid")
    await _promote_superadmin(db_session, ctx["user_id"])

    response = await async_client.patch(
        f"/api/v1/superadmin/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
        json={"plan": "enterprise"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_plan_change_does_not_require_stripe(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    ctx = await register_and_get_context(async_client, "sa-plan-no-stripe")
    await _promote_superadmin(db_session, ctx["user_id"])

    response = await async_client.patch(
        f"/api/v1/superadmin/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
        json={"plan": "pro"},
    )
    assert response.status_code == 200
    assert response.json()["subscription"]["plan"] == "pro"


@pytest.mark.asyncio
async def test_plan_change_still_creates_audit_log(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    ctx = await register_and_get_context(async_client, "sa-plan-audit-persist")
    await _promote_superadmin(db_session, ctx["user_id"])

    await async_client.patch(
        f"/api/v1/superadmin/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
        json={"plan": "starter"},
    )

    logs = await async_client.get(
        "/api/v1/superadmin/audit-logs",
        params={
            "business_id": ctx["business_id"],
            "action": "subscription.plan_changed",
        },
        headers=ctx["headers"],
    )
    assert logs.status_code == 200
    data = logs.json()["data"]
    assert len(data) >= 1
    assert data[0]["metadata"]["new_plan"] == "starter"
    assert data[0]["metadata"]["change_source"] == "superadmin_manual"


@pytest.mark.asyncio
async def test_no_op_plan_update_does_not_error(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    ctx = await register_and_get_context(async_client, "sa-plan-noop")
    await _promote_superadmin(db_session, ctx["user_id"])

    await async_client.patch(
        f"/api/v1/superadmin/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
        json={"plan": "free"},
    )

    response = await async_client.patch(
        f"/api/v1/superadmin/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
        json={"plan": "free"},
    )
    assert response.status_code == 200
    assert response.json()["subscription"]["plan"] == "free"
