import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.business import Business
from app.models.enums import UserRole
from app.models.subscription import Subscription
from app.models.user import User
from tests.conftest import register_and_get_context, register_payload


async def _promote_superadmin(db_session: AsyncSession, user_id: str) -> None:
    await db_session.execute(
        update(User).where(User.id == uuid.UUID(user_id)).values(role=UserRole.superadmin)
    )
    await db_session.commit()


@pytest.mark.asyncio
async def test_register_without_plan_intent_stores_free_intent(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    payload = register_payload("intent-default")
    response = await async_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201

    business = (
        await db_session.execute(
            select(Business).where(Business.slug == payload["business"]["slug"])
        )
    ).scalar_one()
    assert business.settings["selected_plan_intent"] == "free"
    assert business.settings["selected_plan_intent_source"] == "registration"
    assert business.settings.get("selected_plan_intent_recorded_at")


@pytest.mark.asyncio
async def test_register_with_business_plan_intent_persists_settings(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    payload = register_payload("intent-business")
    payload["selected_plan_intent"] = "business"
    response = await async_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201

    business = (
        await db_session.execute(
            select(Business).where(Business.slug == payload["business"]["slug"])
        )
    ).scalar_one()
    assert business.settings["selected_plan_intent"] == "business"
    assert business.settings["selected_plan_intent_source"] == "registration"


@pytest.mark.asyncio
async def test_register_plan_intent_does_not_change_subscription_plan(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    payload = register_payload("intent-sub-free")
    payload["selected_plan_intent"] = "pro"
    response = await async_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201

    business = (
        await db_session.execute(
            select(Business).where(Business.slug == payload["business"]["slug"])
        )
    ).scalar_one()
    subscription = (
        await db_session.execute(
            select(Subscription).where(Subscription.business_id == business.id)
        )
    ).scalar_one()
    assert subscription.plan.value == "free"


@pytest.mark.asyncio
async def test_register_invalid_plan_intent_returns_422(async_client: AsyncClient) -> None:
    payload = register_payload("intent-invalid")
    payload["selected_plan_intent"] = "enterprise"
    response = await async_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_superadmin_detail_exposes_selected_plan_intent(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    sa_ctx = await register_and_get_context(async_client, "intent-sa-admin")
    await _promote_superadmin(db_session, sa_ctx["user_id"])

    token = uuid.uuid4().hex[:8]
    payload = register_payload(f"intent-sa-{token}")
    payload["selected_plan_intent"] = "starter"
    register_response = await async_client.post("/api/v1/auth/register", json=payload)
    assert register_response.status_code == 201
    business_id = register_response.json()["business"]["id"]

    detail = await async_client.get(
        f"/api/v1/superadmin/businesses/{business_id}",
        headers=sa_ctx["headers"],
    )
    assert detail.status_code == 200
    body = detail.json()
    assert body["selected_plan_intent"] == "starter"
    assert body["selected_plan_intent_source"] == "registration"
    assert body["subscription"]["plan"] == "free"


@pytest.mark.asyncio
async def test_superadmin_list_exposes_selected_plan_intent(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    sa_ctx = await register_and_get_context(async_client, "intent-list-admin")
    await _promote_superadmin(db_session, sa_ctx["user_id"])

    token = uuid.uuid4().hex[:8]
    payload = register_payload(f"intent-list-{token}")
    payload["selected_plan_intent"] = "business"
    register_response = await async_client.post("/api/v1/auth/register", json=payload)
    assert register_response.status_code == 201
    business_id = register_response.json()["business"]["id"]

    listing = await async_client.get(
        "/api/v1/superadmin/businesses",
        headers=sa_ctx["headers"],
    )
    assert listing.status_code == 200
    item = next(row for row in listing.json()["data"] if row["id"] == business_id)
    assert item["selected_plan_intent"] == "business"
    assert item["plan"] == "free"
