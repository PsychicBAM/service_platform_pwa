import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import UserRole
from app.models.user import User
from tests.conftest import register_and_get_context, register_payload


async def _promote_superadmin(db_session: AsyncSession, user_id: str) -> dict:
    await db_session.execute(
        update(User).where(User.id == uuid.UUID(user_id)).values(role=UserRole.superadmin)
    )
    await db_session.commit()
    return {}


@pytest.mark.asyncio
async def test_superadmin_detail_includes_plan_intent_metadata(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    sa_ctx = await register_and_get_context(async_client, "sa-intent-detail")
    await _promote_superadmin(db_session, sa_ctx["user_id"])

    payload = register_payload(f"sa-biz-intent-{uuid.uuid4().hex[:6]}")
    payload["selected_plan_intent"] = "business"
    created = await async_client.post("/api/v1/auth/register", json=payload)
    assert created.status_code == 201
    business_id = created.json()["business"]["id"]

    detail = await async_client.get(
        f"/api/v1/superadmin/businesses/{business_id}",
        headers=sa_ctx["headers"],
    )
    assert detail.status_code == 200
    body = detail.json()
    assert body["selected_plan_intent"] == "business"
    assert body["selected_plan_intent_source"] == "registration"
    assert body["selected_plan_intent_recorded_at"]
    assert body["subscription"]["plan"] == "free"


@pytest.mark.asyncio
async def test_superadmin_list_includes_selected_plan_intent(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    sa_ctx = await register_and_get_context(async_client, "sa-intent-list")
    await _promote_superadmin(db_session, sa_ctx["user_id"])

    payload = register_payload(f"sa-list-intent-{uuid.uuid4().hex[:6]}")
    payload["selected_plan_intent"] = "starter"
    created = await async_client.post("/api/v1/auth/register", json=payload)
    assert created.status_code == 201
    business_id = created.json()["business"]["id"]

    listing = await async_client.get(
        "/api/v1/superadmin/businesses",
        headers=sa_ctx["headers"],
    )
    assert listing.status_code == 200
    item = next(row for row in listing.json()["data"] if row["id"] == business_id)
    assert item["selected_plan_intent"] == "starter"
    assert item["plan"] == "free"


@pytest.mark.asyncio
async def test_manual_plan_change_keeps_signup_intent_in_settings(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    sa_ctx = await register_and_get_context(async_client, "sa-intent-keep")
    await _promote_superadmin(db_session, sa_ctx["user_id"])

    payload = register_payload(f"sa-keep-intent-{uuid.uuid4().hex[:6]}")
    payload["selected_plan_intent"] = "business"
    created = await async_client.post("/api/v1/auth/register", json=payload)
    assert created.status_code == 201
    business_id = created.json()["business"]["id"]

    patch = await async_client.patch(
        f"/api/v1/superadmin/businesses/{business_id}",
        headers=sa_ctx["headers"],
        json={"plan": "starter"},
    )
    assert patch.status_code == 200
    body = patch.json()
    assert body["subscription"]["plan"] == "starter"
    assert body["selected_plan_intent"] == "business"


@pytest.mark.asyncio
async def test_manual_plan_change_audit_includes_signup_intent(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    sa_ctx = await register_and_get_context(async_client, "sa-intent-audit")
    await _promote_superadmin(db_session, sa_ctx["user_id"])

    payload = register_payload(f"sa-audit-intent-{uuid.uuid4().hex[:6]}")
    payload["selected_plan_intent"] = "business"
    created = await async_client.post("/api/v1/auth/register", json=payload)
    assert created.status_code == 201
    business_id = created.json()["business"]["id"]

    await async_client.patch(
        f"/api/v1/superadmin/businesses/{business_id}",
        headers=sa_ctx["headers"],
        json={"plan": "business"},
    )
    logs = await async_client.get(
        "/api/v1/superadmin/audit-logs",
        params={
            "business_id": business_id,
            "action": "subscription.plan_changed",
        },
        headers=sa_ctx["headers"],
    )
    assert logs.status_code == 200
    metadata = logs.json()["data"][0]["metadata"]
    assert metadata["old_plan"] == "free"
    assert metadata["new_plan"] == "business"
    assert metadata["selected_plan_intent"] == "business"
    assert metadata["change_source"] == "superadmin_manual"
