import pytest
from httpx import AsyncClient

from app.main import app
from tests.test_public_order_create import (
    _setup_order_business,
    order_payload,
)


async def _create_order(async_client: AsyncClient, ctx: dict, **client) -> dict:
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(ctx["service_id"], **client),
    )
    assert response.status_code == 201
    return response.json()


@pytest.mark.asyncio
async def test_admin_can_list_orders_for_own_business(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "admin-order-list")
    order = await _create_order(async_client, ctx)
    response = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}/orders",
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["meta"]["total"] >= 1
    assert any(item["id"] == order["id"] for item in body["data"])


@pytest.mark.asyncio
async def test_admin_list_excludes_other_business_orders(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx_a = await _setup_order_business(async_client, db_session, "admin-order-list-a")
    ctx_b = await _setup_order_business(async_client, db_session, "admin-order-list-b")
    order_b = await _create_order(async_client, ctx_b)
    response = await async_client.get(
        f"/api/v1/businesses/{ctx_a['business_id']}/orders",
        headers=ctx_a["headers"],
    )
    ids = {item["id"] for item in response.json()["data"]}
    assert order_b["id"] not in ids


@pytest.mark.asyncio
async def test_admin_can_get_order_detail(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "admin-order-detail")
    order = await _create_order(async_client, ctx)
    response = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}/orders/{order['id']}",
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["reference"] == order["reference"]
    assert body["service"]["name"] == "Logo Design"
    assert body["client"]["full_name"] == "Jane Doe"


@pytest.mark.asyncio
async def test_non_member_cannot_list_orders(
    async_client: AsyncClient,
    db_session,
) -> None:
    owner = await _setup_order_business(async_client, db_session, "admin-order-nonmember")
    outsider = await _setup_order_business(async_client, db_session, "admin-order-outsider")
    response = await async_client.get(
        f"/api/v1/businesses/{owner['business_id']}/orders",
        headers=outsider["headers"],
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_from_business_a_cannot_get_business_b_order(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx_a = await _setup_order_business(async_client, db_session, "admin-order-iso-a")
    ctx_b = await _setup_order_business(async_client, db_session, "admin-order-iso-b")
    order_b = await _create_order(async_client, ctx_b)
    response = await async_client.get(
        f"/api/v1/businesses/{ctx_b['business_id']}/orders/{order_b['id']}",
        headers=ctx_a["headers"],
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_accept_submitted_order(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "admin-order-accept")
    order = await _create_order(async_client, ctx)
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/orders/{order['id']}/accept",
        json={"quoted_price_cents": 12000},
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    assert response.json()["status"] == "accepted"
    assert response.json()["quoted_price_cents"] == 12000


@pytest.mark.asyncio
async def test_accept_sets_accepted_at(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "admin-order-accepted-at")
    order = await _create_order(async_client, ctx)
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/orders/{order['id']}/accept",
        json={},
        headers=ctx["headers"],
    )
    assert response.json()["accepted_at"] is not None


@pytest.mark.asyncio
async def test_accept_with_start_work_sets_in_progress(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "admin-order-start-work")
    order = await _create_order(async_client, ctx)
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/orders/{order['id']}/accept",
        json={"start_work": True},
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    assert response.json()["status"] == "in_progress"


@pytest.mark.asyncio
async def test_admin_can_decline_submitted_order_with_reason(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "admin-order-decline")
    order = await _create_order(async_client, ctx)
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/orders/{order['id']}/decline",
        json={"decline_reason": "Out of scope"},
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "declined"
    assert body["decline_reason"] == "Out of scope"


@pytest.mark.asyncio
async def test_decline_without_reason_rejected(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "admin-order-decline-val")
    order = await _create_order(async_client, ctx)
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/orders/{order['id']}/decline",
        json={"decline_reason": "   "},
        headers=ctx["headers"],
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_declined_order_cannot_be_accepted(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "admin-order-no-reaccept")
    order = await _create_order(async_client, ctx)
    await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/orders/{order['id']}/decline",
        json={"decline_reason": "Not a fit"},
        headers=ctx["headers"],
    )
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/orders/{order['id']}/accept",
        json={},
        headers=ctx["headers"],
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_ORDER_STATUS_TRANSITION"


@pytest.mark.asyncio
async def test_admin_can_mark_accepted_order_in_progress(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "admin-order-in-progress")
    order = await _create_order(async_client, ctx)
    await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/orders/{order['id']}/accept",
        json={},
        headers=ctx["headers"],
    )
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/orders/{order['id']}/in-progress",
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    assert response.json()["status"] == "in_progress"


@pytest.mark.asyncio
async def test_admin_can_complete_in_progress_order(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "admin-order-complete")
    order = await _create_order(async_client, ctx)
    await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/orders/{order['id']}/accept",
        json={"start_work": True},
        headers=ctx["headers"],
    )
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/orders/{order['id']}/complete",
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "completed"
    assert body["completed_at"] is not None


@pytest.mark.asyncio
async def test_completed_order_cannot_go_back_to_in_progress(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "admin-order-no-reopen")
    order = await _create_order(async_client, ctx)
    await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/orders/{order['id']}/accept",
        json={"start_work": True},
        headers=ctx["headers"],
    )
    await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/orders/{order['id']}/complete",
        headers=ctx["headers"],
    )
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/orders/{order['id']}/in-progress",
        headers=ctx["headers"],
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_ORDER_STATUS_TRANSITION"


@pytest.mark.asyncio
async def test_admin_can_cancel_submitted_order(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "admin-order-cancel-sub")
    order = await _create_order(async_client, ctx)
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/orders/{order['id']}/cancel",
        json={"reason": "Client withdrew"},
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"


@pytest.mark.asyncio
async def test_cancelled_order_cannot_be_accepted(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "admin-order-cancel-no-accept")
    order = await _create_order(async_client, ctx)
    await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/orders/{order['id']}/cancel",
        json={},
        headers=ctx["headers"],
    )
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/orders/{order['id']}/accept",
        json={},
        headers=ctx["headers"],
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_ORDER_STATUS_TRANSITION"


@pytest.mark.asyncio
async def test_admin_can_update_admin_notes_and_quoted_price(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "admin-order-update")
    order = await _create_order(async_client, ctx)
    response = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/orders/{order['id']}",
        json={"admin_notes": "Follow up Monday", "quoted_price_cents": 9900},
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["admin_notes"] == "Follow up Monday"
    assert body["quoted_price_cents"] == 9900


@pytest.mark.asyncio
async def test_negative_quoted_price_cents_rejected(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "admin-order-bad-price")
    order = await _create_order(async_client, ctx)
    response = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/orders/{order['id']}",
        json={"quoted_price_cents": -100},
        headers=ctx["headers"],
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_search_by_client_name_email_phone_reference_service(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "admin-order-search")
    order = await _create_order(
        async_client,
        ctx,
        full_name="Searchable Client",
        email="searchable@example.com",
        phone="+15559999",
    )
    for term in [
        "Searchable",
        "searchable@example.com",
        "+15559999",
        order["reference"],
        "Logo",
    ]:
        response = await async_client.get(
            f"/api/v1/businesses/{ctx['business_id']}/orders",
            params={"search": term},
            headers=ctx["headers"],
        )
        assert response.status_code == 200
        assert any(item["id"] == order["id"] for item in response.json()["data"])


@pytest.mark.asyncio
async def test_pagination_returns_meta(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "admin-order-page")
    await _create_order(async_client, ctx, email="page1@example.com")
    await _create_order(async_client, ctx, email="page2@example.com")
    response = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}/orders",
        params={"page": 1, "limit": 1},
        headers=ctx["headers"],
    )
    meta = response.json()["meta"]
    assert meta["page"] == 1
    assert meta["limit"] == 1
    assert meta["total"] >= 2


def test_openapi_includes_admin_order_endpoints() -> None:
    paths = app.openapi()["paths"]
    assert "/api/v1/businesses/{business_id}/orders" in paths
    detail = "/api/v1/businesses/{business_id}/orders/{order_id}"
    assert detail in paths
    assert "/api/v1/businesses/{business_id}/orders/{order_id}/accept" in paths
    assert "/api/v1/businesses/{business_id}/orders/{order_id}/decline" in paths
    assert "/api/v1/businesses/{business_id}/orders/{order_id}/complete" in paths
