import uuid

import pytest
from httpx import AsyncClient

from app.main import app
from app.models.client import Client
from app.models.enums import ClientSource, OrderStatus, UserRole
from app.models.order import Order
from app.models.user import User
from app.services.password_service import hash_password
from tests.test_public_order_create import (
    _setup_order_business,
    order_payload,
)


async def _create_client_user(db_session, suffix: str) -> User:
    user = User(
        email=f"order-client-{suffix}@example.com",
        password_hash=hash_password("securePass123"),
        full_name="Order Client",
        role=UserRole.client,
    )
    db_session.add(user)
    await db_session.flush()
    return user


async def _login_client(async_client: AsyncClient, email: str) -> dict:
    response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "securePass123"},
    )
    assert response.status_code == 200
    token = response.json()["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def _setup_user_linked_order(
    async_client: AsyncClient,
    db_session,
    suffix: str,
    *,
    status: OrderStatus = OrderStatus.submitted,
) -> dict:
    biz_ctx = await _setup_order_business(async_client, db_session, suffix)
    user = await _create_client_user(db_session, suffix)
    client = Client(
        business_id=uuid.UUID(biz_ctx["business_id"]),
        user_id=user.id,
        full_name="Order Client",
        email=user.email,
        source=ClientSource.registered,
    )
    db_session.add(client)
    await db_session.flush()
    order = Order(
        business_id=uuid.UUID(biz_ctx["business_id"]),
        service_id=uuid.UUID(biz_ctx["service_id"]),
        client_id=client.id,
        reference=f"OR{uuid.uuid4().hex[:8]}".upper()[:20],
        status=status,
        form_data={"brief": "Logo design"},
    )
    db_session.add(order)
    await db_session.commit()
    headers = await _login_client(async_client, user.email)
    return {
        **biz_ctx,
        "owner_user_id": biz_ctx["user_id"],
        "user_id": str(user.id),
        "order_id": str(order.id),
        "client_headers": headers,
        "client_email": user.email,
    }


async def _admin_set_order_status(
    async_client: AsyncClient,
    ctx: dict,
    status: OrderStatus,
) -> None:
    order_id = ctx["order_id"]
    business_id = ctx["business_id"]
    headers = ctx["headers"]
    if status == OrderStatus.accepted:
        await async_client.post(
            f"/api/v1/businesses/{business_id}/orders/{order_id}/accept",
            json={},
            headers=headers,
        )
    elif status == OrderStatus.in_progress:
        await async_client.post(
            f"/api/v1/businesses/{business_id}/orders/{order_id}/accept",
            json={"start_work": True},
            headers=headers,
        )
    elif status == OrderStatus.completed:
        await async_client.post(
            f"/api/v1/businesses/{business_id}/orders/{order_id}/accept",
            json={"start_work": True},
            headers=headers,
        )
        await async_client.post(
            f"/api/v1/businesses/{business_id}/orders/{order_id}/complete",
            headers=headers,
        )
    elif status == OrderStatus.declined:
        await async_client.post(
            f"/api/v1/businesses/{business_id}/orders/{order_id}/decline",
            json={"decline_reason": "Not available"},
            headers=headers,
        )
    elif status == OrderStatus.cancelled:
        await async_client.post(
            f"/api/v1/businesses/{business_id}/orders/{order_id}/cancel",
            json={},
            headers=headers,
        )


@pytest.mark.asyncio
async def test_user_can_list_own_active_orders(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_order(async_client, db_session, "me-order-list")
    response = await async_client.get(
        "/api/v1/me/orders",
        params={"status": "active"},
        headers=ctx["client_headers"],
    )
    assert response.status_code == 200
    assert any(item["id"] == ctx["order_id"] for item in response.json()["data"])


@pytest.mark.asyncio
async def test_user_cannot_see_another_users_orders(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx_a = await _setup_user_linked_order(async_client, db_session, "me-order-iso-a")
    ctx_b = await _setup_user_linked_order(async_client, db_session, "me-order-iso-b")
    response = await async_client.get(
        "/api/v1/me/orders",
        headers=ctx_a["client_headers"],
    )
    ids = {item["id"] for item in response.json()["data"]}
    assert ctx_b["order_id"] not in ids


@pytest.mark.asyncio
async def test_get_detail_returns_own_order(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_order(async_client, db_session, "me-order-detail")
    response = await async_client.get(
        f"/api/v1/me/orders/{ctx['order_id']}",
        headers=ctx["client_headers"],
    )
    assert response.status_code == 200
    assert response.json()["id"] == ctx["order_id"]
    assert response.json()["form_data"]["brief"] == "Logo design"


@pytest.mark.asyncio
async def test_get_detail_for_other_users_order_returns_404(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx_a = await _setup_user_linked_order(async_client, db_session, "me-order-detail-a")
    ctx_b = await _setup_user_linked_order(async_client, db_session, "me-order-detail-b")
    response = await async_client.get(
        f"/api/v1/me/orders/{ctx_b['order_id']}",
        headers=ctx_a["client_headers"],
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_client_can_cancel_submitted_order(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_order(async_client, db_session, "me-order-cancel-sub")
    response = await async_client.post(
        f"/api/v1/me/orders/{ctx['order_id']}/cancel",
        json={"reason": "Changed mind"},
        headers=ctx["client_headers"],
    )
    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"


@pytest.mark.asyncio
async def test_client_can_cancel_accepted_order(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_order(async_client, db_session, "me-order-cancel-acc")
    await _admin_set_order_status(async_client, ctx, OrderStatus.accepted)
    response = await async_client.post(
        f"/api/v1/me/orders/{ctx['order_id']}/cancel",
        json={},
        headers=ctx["client_headers"],
    )
    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"


@pytest.mark.asyncio
async def test_client_can_cancel_in_progress_order(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_order(async_client, db_session, "me-order-cancel-prog")
    await _admin_set_order_status(async_client, ctx, OrderStatus.in_progress)
    response = await async_client.post(
        f"/api/v1/me/orders/{ctx['order_id']}/cancel",
        json={},
        headers=ctx["client_headers"],
    )
    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "status",
    [OrderStatus.completed, OrderStatus.declined, OrderStatus.cancelled],
)
async def test_client_cannot_cancel_terminal_orders(
    async_client: AsyncClient,
    db_session,
    status: OrderStatus,
) -> None:
    ctx = await _setup_user_linked_order(
        async_client,
        db_session,
        f"me-order-no-cancel-{status.value.replace('_', '-')}",
    )
    await _admin_set_order_status(async_client, ctx, status)
    response = await async_client.post(
        f"/api/v1/me/orders/{ctx['order_id']}/cancel",
        json={},
        headers=ctx["client_headers"],
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_status_filter_active_and_cancelled(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_order(async_client, db_session, "me-order-filter")
    await async_client.post(
        f"/api/v1/me/orders/{ctx['order_id']}/cancel",
        json={},
        headers=ctx["client_headers"],
    )
    active = await async_client.get(
        "/api/v1/me/orders",
        params={"status": "active"},
        headers=ctx["client_headers"],
    )
    cancelled = await async_client.get(
        "/api/v1/me/orders",
        params={"status": "cancelled"},
        headers=ctx["client_headers"],
    )
    assert ctx["order_id"] not in {item["id"] for item in active.json()["data"]}
    assert any(item["id"] == ctx["order_id"] for item in cancelled.json()["data"])


@pytest.mark.asyncio
async def test_pagination_returns_meta(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_order(async_client, db_session, "me-order-page")
    response = await async_client.get(
        "/api/v1/me/orders",
        params={"page": 1, "limit": 1},
        headers=ctx["client_headers"],
    )
    meta = response.json()["meta"]
    assert meta["page"] == 1
    assert meta["limit"] == 1
    assert meta["total"] >= 1


@pytest.mark.asyncio
async def test_guest_orders_not_returned_in_me_orders(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "me-order-guest")
    guest_order = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(ctx["service_id"], email="guest-only@example.com"),
    )
    assert guest_order.status_code == 201

    linked_ctx = await _setup_user_linked_order(async_client, db_session, "me-order-linked")
    response = await async_client.get(
        "/api/v1/me/orders",
        headers=linked_ctx["client_headers"],
    )
    ids = {item["id"] for item in response.json()["data"]}
    assert guest_order.json()["id"] not in ids


def test_openapi_includes_me_orders_endpoints() -> None:
    paths = app.openapi()["paths"]
    assert "/api/v1/me/orders" in paths
    assert "/api/v1/me/orders/{order_id}" in paths
    assert "/api/v1/me/orders/{order_id}/cancel" in paths
