import pytest
from httpx import AsyncClient

from app.main import app
from app.models.enums import OrderStatus
from tests.test_me_orders_routes import (
    _admin_set_order_status,
    _setup_user_linked_order,
)
from tests.test_public_order_create import (
    _setup_order_business,
    order_payload,
)


async def _send_client_message(
    async_client: AsyncClient,
    ctx: dict,
    body: str = "Hello from client",
) -> dict:
    response = await async_client.post(
        f"/api/v1/me/orders/{ctx['order_id']}/messages",
        json={"body": body},
        headers=ctx["client_headers"],
    )
    return response


async def _send_admin_message(
    async_client: AsyncClient,
    ctx: dict,
    body: str = "Hello from admin",
) -> dict:
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/orders/{ctx['order_id']}/messages",
        json={"body": body},
        headers=ctx["headers"],
    )
    return response


@pytest.mark.asyncio
async def test_client_can_list_messages_for_own_order(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_order(async_client, db_session, "msg-list-client")
    await _send_client_message(async_client, ctx, "First message")
    response = await async_client.get(
        f"/api/v1/me/orders/{ctx['order_id']}/messages",
        headers=ctx["client_headers"],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["meta"]["total"] == 1
    assert body["data"][0]["body"] == "First message"


@pytest.mark.asyncio
async def test_client_cannot_list_messages_for_another_users_order(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx_a = await _setup_user_linked_order(async_client, db_session, "msg-list-iso-a")
    ctx_b = await _setup_user_linked_order(async_client, db_session, "msg-list-iso-b")
    response = await async_client.get(
        f"/api/v1/me/orders/{ctx_b['order_id']}/messages",
        headers=ctx_a["client_headers"],
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_client_can_send_message_on_submitted_order(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_order(async_client, db_session, "msg-send-client")
    response = await _send_client_message(async_client, ctx, "Need an update please")
    assert response.status_code == 201
    assert response.json()["sender_type"] == "client"


@pytest.mark.asyncio
async def test_client_cannot_send_message_on_completed_order(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_order(async_client, db_session, "msg-send-closed")
    await _admin_set_order_status(async_client, ctx, OrderStatus.completed)
    response = await _send_client_message(async_client, ctx)
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "ORDER_MESSAGES_CLOSED"


@pytest.mark.asyncio
async def test_client_cannot_send_empty_message(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_order(async_client, db_session, "msg-empty")
    response = await _send_client_message(async_client, ctx, "   ")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_admin_can_list_messages_for_business_order(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_order(async_client, db_session, "msg-list-admin")
    await _send_admin_message(async_client, ctx, "Admin reply")
    response = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}/orders/{ctx['order_id']}/messages",
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    assert response.json()["data"][0]["body"] == "Admin reply"


@pytest.mark.asyncio
async def test_admin_cannot_list_messages_for_another_business_order(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx_a = await _setup_user_linked_order(async_client, db_session, "msg-admin-iso-a")
    ctx_b = await _setup_user_linked_order(async_client, db_session, "msg-admin-iso-b")
    response = await async_client.get(
        f"/api/v1/businesses/{ctx_b['business_id']}/orders/{ctx_b['order_id']}/messages",
        headers=ctx_a["headers"],
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_send_message_on_submitted_order(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_order(async_client, db_session, "msg-send-admin")
    response = await _send_admin_message(async_client, ctx, "We received your order")
    assert response.status_code == 201
    assert response.json()["sender_type"] == "admin"


@pytest.mark.asyncio
async def test_admin_cannot_send_message_on_cancelled_order(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_order(async_client, db_session, "msg-admin-cancelled")
    await _admin_set_order_status(async_client, ctx, OrderStatus.cancelled)
    response = await _send_admin_message(async_client, ctx)
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "ORDER_MESSAGES_CLOSED"


@pytest.mark.asyncio
async def test_messages_preserve_oldest_first_order(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_order(async_client, db_session, "msg-order")
    await _send_client_message(async_client, ctx, "First")
    await _send_admin_message(async_client, ctx, "Second")
    await _send_client_message(async_client, ctx, "Third")
    response = await async_client.get(
        f"/api/v1/me/orders/{ctx['order_id']}/messages",
        headers=ctx["client_headers"],
    )
    bodies = [m["body"] for m in response.json()["data"]]
    assert bodies == ["First", "Second", "Third"]


@pytest.mark.asyncio
async def test_client_message_has_sender_type_client(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_order(async_client, db_session, "msg-sender-client")
    response = await _send_client_message(async_client, ctx)
    assert response.json()["sender_type"] == "client"
    assert response.json()["sender_user_id"] == ctx["user_id"]


@pytest.mark.asyncio
async def test_admin_message_has_sender_type_admin(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_order(async_client, db_session, "msg-sender-admin")
    response = await _send_admin_message(async_client, ctx)
    assert response.json()["sender_type"] == "admin"
    assert response.json()["sender_user_id"] == ctx["owner_user_id"]


@pytest.mark.asyncio
async def test_non_member_cannot_use_admin_message_endpoints(
    async_client: AsyncClient,
    db_session,
) -> None:
    owner = await _setup_user_linked_order(async_client, db_session, "msg-nonmember-owner")
    outsider = await _setup_user_linked_order(async_client, db_session, "msg-nonmember-outsider")
    list_resp = await async_client.get(
        f"/api/v1/businesses/{owner['business_id']}/orders/{owner['order_id']}/messages",
        headers=outsider["headers"],
    )
    send_resp = await async_client.post(
        f"/api/v1/businesses/{owner['business_id']}/orders/{owner['order_id']}/messages",
        json={"body": "Intruder"},
        headers=outsider["headers"],
    )
    assert list_resp.status_code == 403
    assert send_resp.status_code == 403


@pytest.mark.asyncio
async def test_guest_order_not_accessible_via_me_messages(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "msg-guest")
    guest_order = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(ctx["service_id"], email="guest-msg@example.com"),
    )
    assert guest_order.status_code == 201
    order_id = guest_order.json()["id"]

    linked_ctx = await _setup_user_linked_order(async_client, db_session, "msg-guest-linked")
    list_resp = await async_client.get(
        f"/api/v1/me/orders/{order_id}/messages",
        headers=linked_ctx["client_headers"],
    )
    send_resp = await async_client.post(
        f"/api/v1/me/orders/{order_id}/messages",
        json={"body": "Hello"},
        headers=linked_ctx["client_headers"],
    )
    assert list_resp.status_code == 404
    assert send_resp.status_code == 404


@pytest.mark.asyncio
async def test_last_message_preview_in_my_orders_list(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_order(async_client, db_session, "msg-preview")
    await _send_client_message(async_client, ctx, "Preview text for list")
    response = await async_client.get(
        "/api/v1/me/orders",
        headers=ctx["client_headers"],
    )
    item = next(i for i in response.json()["data"] if i["id"] == ctx["order_id"])
    assert item["last_message_preview"] == "Preview text for list"


def test_openapi_includes_order_message_endpoints() -> None:
    paths = app.openapi()["paths"]
    me_messages = "/api/v1/me/orders/{order_id}/messages"
    admin_messages = "/api/v1/businesses/{business_id}/orders/{order_id}/messages"
    assert me_messages in paths
    assert "get" in paths[me_messages]
    assert "post" in paths[me_messages]
    assert admin_messages in paths
    assert "get" in paths[admin_messages]
    assert "post" in paths[admin_messages]
