import uuid
from types import SimpleNamespace

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import SubscriptionPlan, SubscriptionStatus
from app.repositories.business_repository import BusinessRepository
from app.utils.public_page_variant import resolve_public_page_variant
from tests.conftest import activate_business, register_and_get_context


def test_resolve_public_page_variant_active_pro() -> None:
    subscription = SimpleNamespace(
        plan=SubscriptionPlan.pro,
        status=SubscriptionStatus.active,
    )
    assert resolve_public_page_variant(subscription).value == "mini_site"


@pytest.mark.parametrize(
    ("plan", "status"),
    [
        (SubscriptionPlan.free, SubscriptionStatus.active),
        (SubscriptionPlan.starter, SubscriptionStatus.active),
        (SubscriptionPlan.business, SubscriptionStatus.active),
        (SubscriptionPlan.pro, SubscriptionStatus.trialing),
        (SubscriptionPlan.pro, SubscriptionStatus.cancelled),
        (SubscriptionPlan.pro, SubscriptionStatus.past_due),
    ],
)
def test_resolve_public_page_variant_standard_cases(
    plan: SubscriptionPlan,
    status: SubscriptionStatus,
) -> None:
    subscription = SimpleNamespace(plan=plan, status=status)
    assert resolve_public_page_variant(subscription).value == "standard"


def test_resolve_public_page_variant_without_subscription() -> None:
    assert resolve_public_page_variant(None).value == "standard"


@pytest.mark.asyncio
async def test_public_business_includes_public_page_variant(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    ctx = await register_and_get_context(async_client, "public-variant-field")
    await activate_business(db_session, ctx["slug"])
    response = await async_client.get(f"/api/v1/public/b/{ctx['slug']}")
    assert response.status_code == 200
    assert response.json()["public_page_variant"] == "standard"


@pytest.mark.asyncio
async def test_public_business_mini_site_for_active_pro(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    ctx = await register_and_get_context(async_client, "public-variant-pro")
    await activate_business(db_session, ctx["slug"])
    repo = BusinessRepository(db_session)
    subscription = await repo.get_subscription(uuid.UUID(ctx["business_id"]))
    assert subscription is not None
    await repo.update_subscription(
        subscription,
        {"plan": SubscriptionPlan.pro, "status": SubscriptionStatus.active},
    )
    await db_session.commit()

    response = await async_client.get(f"/api/v1/public/b/{ctx['slug']}")
    assert response.status_code == 200
    assert response.json()["public_page_variant"] == "mini_site"


@pytest.mark.asyncio
async def test_public_business_standard_for_business_plan(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    ctx = await register_and_get_context(async_client, "public-variant-biz")
    await activate_business(db_session, ctx["slug"])
    repo = BusinessRepository(db_session)
    subscription = await repo.get_subscription(uuid.UUID(ctx["business_id"]))
    assert subscription is not None
    await repo.update_subscription(
        subscription,
        {"plan": SubscriptionPlan.business, "status": SubscriptionStatus.active},
    )
    await db_session.commit()

    response = await async_client.get(f"/api/v1/public/b/{ctx['slug']}")
    assert response.status_code == 200
    assert response.json()["public_page_variant"] == "standard"


@pytest.mark.asyncio
async def test_public_business_does_not_expose_subscription_internals(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    ctx = await register_and_get_context(async_client, "public-variant-safe")
    await activate_business(db_session, ctx["slug"])
    repo = BusinessRepository(db_session)
    subscription = await repo.get_subscription(uuid.UUID(ctx["business_id"]))
    assert subscription is not None
    await repo.update_subscription(
        subscription,
        {
            "plan": SubscriptionPlan.pro,
            "status": SubscriptionStatus.active,
            "stripe_subscription_id": "sub_secret_123",
            "stripe_customer_id": "cus_secret_456",
        },
    )
    await db_session.commit()

    response = await async_client.get(f"/api/v1/public/b/{ctx['slug']}")
    assert response.status_code == 200
    body = response.json()
    assert body["public_page_variant"] == "mini_site"
    assert "subscription" not in body
    assert "stripe_subscription_id" not in body
    assert "stripe_customer_id" not in body
    assert "plan" not in body
