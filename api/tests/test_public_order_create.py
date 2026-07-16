import uuid
import re
from datetime import UTC, datetime
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select, update

from app.main import app
from app.models.booking import Booking
from app.models.business import Business
from app.models.client import Client
from app.models.enums import OperatingMode, OrderStatus
from app.models.order import Order
from tests.conftest import (
    BOOKING_SERVICE_PAYLOAD,
    ORDER_SERVICE_PAYLOAD,
    activate_business,
    assert_has_bearer_auth,
    assert_response_status,
    register_and_get_context,
    refresh_owner_auth,
)
from tests.test_bookings_availability_blocking import (
    FIXED_NOW,
    TARGET_DATE,
    _setup_booking_business,
)


async def _setup_order_business(
    async_client: AsyncClient,
    db_session,
    suffix: str,
    *,
    operating_mode: OperatingMode | None = None,
) -> dict:
    safe_suffix = suffix.replace("_", "-")
    ctx = await register_and_get_context(async_client, safe_suffix)
    assert_has_bearer_auth(ctx["headers"])
    await activate_business(db_session, ctx["slug"])
    ctx = await refresh_owner_auth(async_client, ctx)
    if operating_mode is not None:
        await db_session.execute(
            update(Business)
            .where(Business.slug == ctx["slug"])
            .values(operating_mode=operating_mode)
        )
        await db_session.commit()
    service_resp = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json=ORDER_SERVICE_PAYLOAD,
        headers=ctx["headers"],
    )
    assert_response_status(service_resp, 201, context="order service create")
    ctx["service_id"] = service_resp.json()["id"]
    return ctx


def order_payload(service_id: str, **client) -> dict:
    return {
        "service_id": service_id,
        "form_data": {"brief": "Need a logo redesign", "colors": "blue and white"},
        "legal_consent_accepted": True,
        "client": {
            "full_name": "Jane Doe",
            "email": "jane.doe@example.com",
            "phone": "+15550101",
            **client,
        },
    }


@pytest.mark.asyncio
async def test_public_order_can_be_created(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "pub-order-create")
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(ctx["service_id"]),
    )
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "submitted"
    year = datetime.now(UTC).year
    yy = year % 100
    assert body["reference"].startswith(f"REQ-{yy:02d}-")
    assert re.fullmatch(rf"REQ-{yy:02d}-\d{{4}}", body["reference"]) is not None
    assert body["service"]["type"] == "order"
    assert body["form_data"]["brief"] == "Need a logo redesign"
    assert body["payment_required"] is False
    assert body["payment"] is None


@pytest.mark.asyncio
async def test_order_creates_client_when_not_exists(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "pub-order-new-client")
    await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(ctx["service_id"], email="neworderclient@example.com"),
    )
    client = (
        await db_session.execute(
            select(Client).where(
                Client.business_id == uuid.UUID(ctx["business_id"]),
                Client.email == "neworderclient@example.com",
            )
        )
    ).scalar_one()
    assert client.full_name == "Jane Doe"


@pytest.mark.asyncio
async def test_order_reuses_existing_client_by_email(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "pub-order-reuse-client")
    email = "order-reuse@example.com"
    first = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(ctx["service_id"], email=email),
    )
    second = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(
            ctx["service_id"],
            email=email,
            form_data={"note": "Second order"},
        ),
    )
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["client"]["id"] == second.json()["client"]["id"]


@pytest.mark.asyncio
async def test_order_status_submitted_by_default(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "pub-order-status")
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(ctx["service_id"]),
    )
    assert response.json()["status"] == "submitted"
    order = (
        await db_session.execute(
            select(Order).where(Order.reference == response.json()["reference"])
        )
    ).scalar_one()
    assert order.status == OrderStatus.submitted


@pytest.mark.asyncio
async def test_booking_service_cannot_create_order(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "pub-order-booking-svc")
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(ctx["service_id"]),
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "SERVICE_NOT_ORDERABLE"


@pytest.mark.asyncio
async def test_inactive_service_cannot_create_order(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "pub-order-inactive")
    await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/services/{ctx['service_id']}",
        json={"is_active": False},
        headers=ctx["headers"],
    )
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(ctx["service_id"]),
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_booking_only_business_rejects_order(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "pub-order-booking-only")
    await db_session.execute(
        update(Business)
        .where(Business.slug == ctx["slug"])
        .values(operating_mode=OperatingMode.booking_only)
    )
    await db_session.commit()
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(ctx["service_id"]),
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "ORDERS_DISABLED"


@pytest.mark.asyncio
async def test_orders_only_business_allows_order(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(
        async_client,
        db_session,
        "pub-order-orders-only",
        operating_mode=OperatingMode.orders_only,
    )
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(ctx["service_id"]),
    )
    assert response.status_code == 201


@pytest.mark.asyncio
async def test_both_business_allows_order(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(
        async_client,
        db_session,
        "pub-order-both",
        operating_mode=OperatingMode.both,
    )
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(ctx["service_id"]),
    )
    assert response.status_code == 201


@pytest.mark.asyncio
async def test_pending_setup_business_rejects_public_order(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "pub-order-pending-biz")
    service_resp = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json=ORDER_SERVICE_PAYLOAD,
        headers=ctx["headers"],
    )
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(service_resp.json()["id"]),
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_client_input_requires_name_and_email_or_phone(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "pub-order-client-val")
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json={
            "service_id": ctx["service_id"],
            "form_data": {},
            "legal_consent_accepted": True,
            "client": {"full_name": "Jane Doe"},
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_form_data_must_be_object(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "pub-order-form-val")
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json={
            "service_id": ctx["service_id"],
            "form_data": ["not", "an", "object"],
            "legal_consent_accepted": True,
            "client": {
                "full_name": "Jane Doe",
                "email": "form@example.com",
            },
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_order_reference_unique_per_business(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "pub-order-ref")
    first = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(ctx["service_id"], email="first@example.com"),
    )
    second = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(ctx["service_id"], email="second@example.com"),
    )
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["reference"] != second.json()["reference"]


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_order_does_not_touch_availability_or_bookings(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "pub-order-no-sidefx")
    order_resp = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json=ORDER_SERVICE_PAYLOAD,
        headers=ctx["headers"],
    )
    order_service_id = order_resp.json()["id"]

    booking_count_before = (
        await db_session.execute(select(func.count()).select_from(Booking))
    ).scalar_one()
    avail_before = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/availability",
        params={"service_id": ctx["service_id"], "date": TARGET_DATE.isoformat()},
    )

    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(order_service_id),
    )
    assert response.status_code == 201

    booking_count_after = (
        await db_session.execute(select(func.count()).select_from(Booking))
    ).scalar_one()
    avail_after = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/availability",
        params={"service_id": ctx["service_id"], "date": TARGET_DATE.isoformat()},
    )
    assert booking_count_after == booking_count_before
    assert avail_before.json()["slots"] == avail_after.json()["slots"]


def test_openapi_includes_public_order_create() -> None:
    paths = app.openapi()["paths"]
    assert "/api/v1/public/b/{slug}/orders" in paths
    assert "post" in paths["/api/v1/public/b/{slug}/orders"]
