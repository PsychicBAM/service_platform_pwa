from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.main import app
from app.models.client import Client
from tests.test_bookings_availability_blocking import (
    FIXED_NOW,
    _setup_booking_business,
)
from tests.test_public_booking_create import booking_payload
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


async def _create_booking(async_client: AsyncClient, ctx: dict, **client) -> dict:
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"], **client),
    )
    assert response.status_code == 201
    return response.json()


async def _get_client_id(db_session, business_id: str, email: str) -> str:
    result = await db_session.execute(
        select(Client).where(
            Client.business_id == business_id,
            Client.email == email.lower(),
        )
    )
    client = result.scalar_one()
    return str(client.id)


@pytest.mark.asyncio
async def test_admin_can_list_clients_for_own_business(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "admin-client-list")
    await _create_order(async_client, ctx, email="list-client@example.com")
    response = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}/clients",
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["meta"]["total"] >= 1
    assert any(item["email"] == "list-client@example.com" for item in body["data"])


@pytest.mark.asyncio
async def test_client_list_excludes_other_business_clients(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx_a = await _setup_order_business(async_client, db_session, "admin-client-list-a")
    ctx_b = await _setup_order_business(async_client, db_session, "admin-client-list-b")
    await _create_order(async_client, ctx_b, email="other-biz@example.com")
    response = await async_client.get(
        f"/api/v1/businesses/{ctx_a['business_id']}/clients",
        headers=ctx_a["headers"],
    )
    emails = {item["email"] for item in response.json()["data"]}
    assert "other-biz@example.com" not in emails


@pytest.mark.asyncio
async def test_search_by_full_name(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "admin-client-search-name")
    await _create_order(async_client, ctx, full_name="Unique Search Name", email="name@example.com")
    response = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}/clients",
        params={"search": "Unique Search"},
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    names = {item["full_name"] for item in response.json()["data"]}
    assert "Unique Search Name" in names


@pytest.mark.asyncio
async def test_search_by_email(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "admin-client-search-email")
    await _create_order(async_client, ctx, email="search.email@example.com")
    response = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}/clients",
        params={"search": "search.email"},
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    emails = {item["email"] for item in response.json()["data"]}
    assert "search.email@example.com" in emails


@pytest.mark.asyncio
async def test_search_by_phone(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "admin-client-search-phone")
    await _create_order(async_client, ctx, email="phone@example.com", phone="+15559988")
    response = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}/clients",
        params={"search": "5559988"},
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    phones = {item["phone"] for item in response.json()["data"]}
    assert "+15559988" in phones


@pytest.mark.asyncio
async def test_pagination_returns_page_limit_total(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "admin-client-page")
    await _create_order(async_client, ctx, email="page1@example.com")
    await _create_order(async_client, ctx, email="page2@example.com")
    response = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}/clients",
        params={"page": 1, "limit": 1},
        headers=ctx["headers"],
    )
    meta = response.json()["meta"]
    assert meta["page"] == 1
    assert meta["limit"] == 1
    assert meta["total"] >= 2


@pytest.mark.asyncio
async def test_admin_can_get_client_detail(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "admin-client-detail")
    await _create_order(async_client, ctx, email="detail@example.com", full_name="Detail Client")
    client_id = await _get_client_id(db_session, ctx["business_id"], "detail@example.com")
    response = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}/clients/{client_id}",
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["full_name"] == "Detail Client"
    assert body["email"] == "detail@example.com"


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_client_detail_includes_booking_summaries(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "admin-client-bookings")
    booking = await _create_booking(
        async_client,
        ctx,
        email="booking-detail@example.com",
    )
    client_id = await _get_client_id(
        db_session,
        ctx["business_id"],
        "booking-detail@example.com",
    )
    response = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}/clients/{client_id}",
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    bookings = response.json()["bookings"]
    assert len(bookings) >= 1
    assert any(item["id"] == booking["id"] for item in bookings)
    assert bookings[0]["service_name"]


@pytest.mark.asyncio
async def test_client_detail_includes_order_summaries(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "admin-client-orders")
    order = await _create_order(async_client, ctx, email="order-detail@example.com")
    client_id = await _get_client_id(
        db_session,
        ctx["business_id"],
        "order-detail@example.com",
    )
    response = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}/clients/{client_id}",
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    orders = response.json()["orders"]
    assert len(orders) >= 1
    assert any(item["id"] == order["id"] for item in orders)
    assert orders[0]["service_name"] == "Logo Design"


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_client_detail_includes_counts(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "admin-client-counts")
    order_service = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json={
            "name": "Logo Design",
            "description": "Custom logo",
            "type": "order",
            "price_cents": 15000,
            "currency": "USD",
            "price_type": "fixed",
        },
        headers=ctx["headers"],
    )
    assert order_service.status_code == 201
    order_service_id = order_service.json()["id"]
    await _create_booking(async_client, ctx, email="counts@example.com")
    await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(order_service_id, email="counts@example.com"),
    )
    client_id = await _get_client_id(
        db_session,
        ctx["business_id"],
        "counts@example.com",
    )
    response = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}/clients/{client_id}",
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["bookings_count"] >= 1
    assert body["orders_count"] >= 1


@pytest.mark.asyncio
async def test_non_member_cannot_list_clients(
    async_client: AsyncClient,
    db_session,
) -> None:
    owner = await _setup_order_business(async_client, db_session, "admin-client-nonmember")
    outsider = await _setup_order_business(async_client, db_session, "admin-client-outsider")
    response = await async_client.get(
        f"/api/v1/businesses/{owner['business_id']}/clients",
        headers=outsider["headers"],
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_from_business_a_cannot_get_business_b_client(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx_a = await _setup_order_business(async_client, db_session, "admin-client-cross-a")
    ctx_b = await _setup_order_business(async_client, db_session, "admin-client-cross-b")
    await _create_order(async_client, ctx_b, email="cross@example.com")
    client_id = await _get_client_id(db_session, ctx_b["business_id"], "cross@example.com")
    response = await async_client.get(
        f"/api/v1/businesses/{ctx_b['business_id']}/clients/{client_id}",
        headers=ctx_a["headers"],
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_update_client_contact_and_notes(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "admin-client-update")
    await _create_order(async_client, ctx, email="update@example.com")
    client_id = await _get_client_id(db_session, ctx["business_id"], "update@example.com")
    response = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/clients/{client_id}",
        headers=ctx["headers"],
        json={
            "full_name": "Updated Name",
            "phone": "+15551234",
            "notes": "VIP client",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["full_name"] == "Updated Name"
    assert body["phone"] == "+15551234"
    assert body["notes"] == "VIP client"


@pytest.mark.asyncio
async def test_admin_can_update_email(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "admin-client-update-email")
    await _create_order(async_client, ctx, email="old-email@example.com")
    client_id = await _get_client_id(db_session, ctx["business_id"], "old-email@example.com")
    response = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/clients/{client_id}",
        headers=ctx["headers"],
        json={"email": "new-email@example.com"},
    )
    assert response.status_code == 200
    assert response.json()["email"] == "new-email@example.com"


@pytest.mark.asyncio
async def test_duplicate_email_in_same_business_returns_409(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "admin-client-dup-email")
    await _create_order(async_client, ctx, email="first@example.com")
    await _create_order(async_client, ctx, email="second@example.com")
    client_id = await _get_client_id(db_session, ctx["business_id"], "second@example.com")
    response = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/clients/{client_id}",
        headers=ctx["headers"],
        json={"email": "first@example.com"},
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "CLIENT_EMAIL_EXISTS"


@pytest.mark.asyncio
async def test_same_email_in_different_business_is_allowed(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx_a = await _setup_order_business(async_client, db_session, "admin-client-email-a")
    ctx_b = await _setup_order_business(async_client, db_session, "admin-client-email-b")
    await _create_order(async_client, ctx_a, email="shared@example.com")
    await _create_order(async_client, ctx_b, email="other@example.com")
    client_id_b = await _get_client_id(db_session, ctx_b["business_id"], "other@example.com")
    response = await async_client.patch(
        f"/api/v1/businesses/{ctx_b['business_id']}/clients/{client_id_b}",
        headers=ctx_b["headers"],
        json={"email": "shared@example.com"},
    )
    assert response.status_code == 200
    assert response.json()["email"] == "shared@example.com"


def test_openapi_includes_clients_endpoints() -> None:
    paths = app.openapi()["paths"]
    assert "/api/v1/businesses/{business_id}/clients" in paths
    assert "/api/v1/businesses/{business_id}/clients/{client_id}" in paths
