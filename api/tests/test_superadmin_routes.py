import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import update

from app.main import app
from app.models.enums import UserRole
from app.models.user import User
from tests.conftest import activate_business, register_and_get_context


async def _promote_superadmin(db_session, user_id: str) -> None:
    await db_session.execute(
        update(User).where(User.id == uuid.UUID(user_id)).values(role=UserRole.superadmin)
    )
    await db_session.commit()
    db_session.expire_all()


async def _set_user_role(db_session, user_id: str, role: UserRole) -> None:
    await db_session.execute(
        update(User).where(User.id == uuid.UUID(user_id)).values(role=role)
    )
    await db_session.commit()
    db_session.expire_all()


@pytest.mark.asyncio
async def test_superadmin_can_list_businesses(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "sa-list")
    await _promote_superadmin(db_session, ctx["user_id"])
    response = await async_client.get(
        "/api/v1/superadmin/businesses",
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["meta"]["total"] >= 1
    assert any(item["id"] == ctx["business_id"] for item in body["data"])


@pytest.mark.asyncio
async def test_business_admin_cannot_list_superadmin_businesses(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "sa-deny-admin")
    response = await async_client.get(
        "/api/v1/superadmin/businesses",
        headers=ctx["headers"],
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_client_user_cannot_list_superadmin_businesses(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "sa-deny-client")
    await _set_user_role(db_session, ctx["user_id"], UserRole.client)
    response = await async_client.get(
        "/api/v1/superadmin/businesses",
        headers=ctx["headers"],
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_superadmin_can_get_business_detail(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "sa-detail")
    await _promote_superadmin(db_session, ctx["user_id"])
    response = await async_client.get(
        f"/api/v1/superadmin/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["slug"] == ctx["slug"]
    assert body["owner"] is not None
    assert body["subscription"] is not None


@pytest.mark.asyncio
async def test_superadmin_can_update_business_status_to_active(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "sa-activate")
    await _promote_superadmin(db_session, ctx["user_id"])
    response = await async_client.patch(
        f"/api/v1/superadmin/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
        json={"status": "active"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "active"


@pytest.mark.asyncio
async def test_status_change_creates_audit_log(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "sa-audit-status")
    await _promote_superadmin(db_session, ctx["user_id"])
    await async_client.patch(
        f"/api/v1/superadmin/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
        json={"status": "active"},
    )
    logs = await async_client.get(
        "/api/v1/superadmin/audit-logs",
        params={
            "business_id": ctx["business_id"],
            "action": "business.status_changed",
        },
        headers=ctx["headers"],
    )
    assert logs.status_code == 200
    data = logs.json()["data"]
    assert len(data) >= 1
    assert data[0]["metadata"]["new_status"] == "active"


@pytest.mark.asyncio
@pytest.mark.parametrize("plan", ["starter", "business", "pro", "free"])
async def test_superadmin_can_update_plan(
    async_client: AsyncClient,
    db_session,
    plan: str,
) -> None:
    ctx = await register_and_get_context(async_client, f"sa-plan-{plan}")
    await _promote_superadmin(db_session, ctx["user_id"])
    response = await async_client.patch(
        f"/api/v1/superadmin/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
        json={"plan": plan},
    )
    assert response.status_code == 200
    assert response.json()["subscription"]["plan"] == plan


@pytest.mark.asyncio
async def test_plan_change_updates_subscription(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "sa-plan-update")
    await _promote_superadmin(db_session, ctx["user_id"])
    await async_client.patch(
        f"/api/v1/superadmin/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
        json={"plan": "business"},
    )
    detail = await async_client.get(
        f"/api/v1/superadmin/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
    )
    assert detail.json()["subscription"]["plan"] == "business"


@pytest.mark.asyncio
async def test_plan_change_creates_audit_log(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "sa-audit-plan")
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


@pytest.mark.asyncio
async def test_invalid_status_rejected(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "sa-invalid-status")
    await _promote_superadmin(db_session, ctx["user_id"])
    response = await async_client.patch(
        f"/api/v1/superadmin/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
        json={"status": "deleted"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_invalid_plan_rejected(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "sa-invalid-plan")
    await _promote_superadmin(db_session, ctx["user_id"])
    response = await async_client.patch(
        f"/api/v1/superadmin/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
        json={"plan": "enterprise"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_business_search_by_name(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "sa-search-name")
    await _promote_superadmin(db_session, ctx["user_id"])
    response = await async_client.get(
        "/api/v1/superadmin/businesses",
        params={"search": "Joe's Salon"},
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    names = {item["name"] for item in response.json()["data"]}
    assert "Joe's Salon" in names


@pytest.mark.asyncio
async def test_business_search_by_slug(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "sa-search-slug")
    await _promote_superadmin(db_session, ctx["user_id"])
    response = await async_client.get(
        "/api/v1/superadmin/businesses",
        params={"search": ctx["slug"]},
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    slugs = {item["slug"] for item in response.json()["data"]}
    assert ctx["slug"] in slugs


@pytest.mark.asyncio
async def test_business_search_by_owner_email(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "sa-search-email")
    await _promote_superadmin(db_session, ctx["user_id"])
    owner_email = ctx["payload"]["email"]
    response = await async_client.get(
        "/api/v1/superadmin/businesses",
        params={"search": owner_email},
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    emails = {item["owner_email"] for item in response.json()["data"]}
    assert owner_email in emails


@pytest.mark.asyncio
async def test_status_filter_works(
    async_client: AsyncClient,
    db_session,
) -> None:
    active_ctx = await register_and_get_context(async_client, "sa-filter-active")
    pending_ctx = await register_and_get_context(async_client, "sa-filter-pending")
    await activate_business(db_session, active_ctx["slug"])
    await _promote_superadmin(db_session, active_ctx["user_id"])
    response = await async_client.get(
        "/api/v1/superadmin/businesses",
        params={"status": "active"},
        headers=active_ctx["headers"],
    )
    assert response.status_code == 200
    ids = {item["id"] for item in response.json()["data"]}
    assert active_ctx["business_id"] in ids
    assert pending_ctx["business_id"] not in ids


@pytest.mark.asyncio
async def test_plan_filter_works(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "sa-filter-plan")
    other = await register_and_get_context(async_client, "sa-filter-plan-other")
    await _promote_superadmin(db_session, ctx["user_id"])
    await async_client.patch(
        f"/api/v1/superadmin/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
        json={"plan": "pro"},
    )
    response = await async_client.get(
        "/api/v1/superadmin/businesses",
        params={"plan": "pro"},
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    ids = {item["id"] for item in response.json()["data"]}
    assert ctx["business_id"] in ids
    assert other["business_id"] not in ids


@pytest.mark.asyncio
async def test_superadmin_can_list_audit_logs(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "sa-audit-list")
    await _promote_superadmin(db_session, ctx["user_id"])
    await async_client.patch(
        f"/api/v1/superadmin/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
        json={"status": "active"},
    )
    response = await async_client.get(
        "/api/v1/superadmin/audit-logs",
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    assert response.json()["meta"]["total"] >= 1


@pytest.mark.asyncio
async def test_audit_logs_filter_by_business_id(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx_a = await register_and_get_context(async_client, "sa-audit-biz-a")
    ctx_b = await register_and_get_context(async_client, "sa-audit-biz-b")
    await _promote_superadmin(db_session, ctx_a["user_id"])
    await async_client.patch(
        f"/api/v1/superadmin/businesses/{ctx_a['business_id']}",
        headers=ctx_a["headers"],
        json={"status": "active"},
    )
    await async_client.patch(
        f"/api/v1/superadmin/businesses/{ctx_b['business_id']}",
        headers=ctx_b["headers"],
        json={"status": "active"},
    )
    response = await async_client.get(
        "/api/v1/superadmin/audit-logs",
        params={"business_id": ctx_a["business_id"]},
        headers=ctx_a["headers"],
    )
    business_ids = {item["business_id"] for item in response.json()["data"]}
    assert business_ids == {ctx_a["business_id"]}


@pytest.mark.asyncio
async def test_audit_logs_filter_by_action(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "sa-audit-action")
    await _promote_superadmin(db_session, ctx["user_id"])
    await async_client.patch(
        f"/api/v1/superadmin/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
        json={"status": "active", "plan": "starter"},
    )
    response = await async_client.get(
        "/api/v1/superadmin/audit-logs",
        params={"action": "subscription.plan_changed"},
        headers=ctx["headers"],
    )
    actions = {item["action"] for item in response.json()["data"]}
    assert actions == {"subscription.plan_changed"}


def test_openapi_includes_superadmin_endpoints() -> None:
    paths = app.openapi()["paths"]
    assert "/api/v1/superadmin/businesses" in paths
    assert "/api/v1/superadmin/businesses/{business_id}" in paths
    assert "/api/v1/superadmin/audit-logs" in paths
