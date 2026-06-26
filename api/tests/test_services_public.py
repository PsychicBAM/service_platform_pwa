import pytest
from httpx import AsyncClient
from sqlalchemy import update

from app.models.business import Business
from app.models.enums import BusinessStatus
from tests.conftest import (
    BOOKING_SERVICE_PAYLOAD,
    ORDER_SERVICE_PAYLOAD,
    register_and_get_context,
)


async def _activate_business(db_session, slug: str) -> None:
    await db_session.execute(
        update(Business)
        .where(Business.slug == slug)
        .values(status=BusinessStatus.active)
    )
    await db_session.commit()


async def _set_operating_mode(db_session, slug: str, mode: str) -> None:
    from app.models.enums import OperatingMode

    await db_session.execute(
        update(Business)
        .where(Business.slug == slug)
        .values(operating_mode=OperatingMode(mode))
    )
    await db_session.commit()


@pytest.mark.asyncio
async def test_public_service_list_returns_only_active_services(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "pub-active-only")
    await _activate_business(db_session, ctx["slug"])

    active_resp = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json=BOOKING_SERVICE_PAYLOAD,
        headers=ctx["headers"],
    )
    inactive_resp = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json={**ORDER_SERVICE_PAYLOAD, "name": "Inactive Order", "is_active": False},
        headers=ctx["headers"],
    )
    assert active_resp.status_code == 201
    assert inactive_resp.status_code == 201

    public_resp = await async_client.get(f"/api/v1/public/b/{ctx['slug']}/services")
    assert public_resp.status_code == 200
    names = {item["name"] for item in public_resp.json()}
    assert "Haircut" in names
    assert "Inactive Order" not in names


@pytest.mark.asyncio
async def test_public_type_filter_works(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "pub-type-filter")
    await _activate_business(db_session, ctx["slug"])

    await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json=BOOKING_SERVICE_PAYLOAD,
        headers=ctx["headers"],
    )
    await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json=ORDER_SERVICE_PAYLOAD,
        headers=ctx["headers"],
    )

    booking_resp = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/services?type=booking"
    )
    order_resp = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/services?type=order"
    )
    assert booking_resp.status_code == 200
    assert order_resp.status_code == 200
    assert all(s["type"] == "booking" for s in booking_resp.json())
    assert all(s["type"] == "order" for s in order_resp.json())


@pytest.mark.asyncio
async def test_booking_only_business_hides_order_services_publicly(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "pub-booking-only")
    await _activate_business(db_session, ctx["slug"])

    await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json=BOOKING_SERVICE_PAYLOAD,
        headers=ctx["headers"],
    )
    await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json=ORDER_SERVICE_PAYLOAD,
        headers=ctx["headers"],
    )
    await _set_operating_mode(db_session, ctx["slug"], "booking_only")

    public_resp = await async_client.get(f"/api/v1/public/b/{ctx['slug']}/services")
    assert public_resp.status_code == 200
    assert len(public_resp.json()) == 1
    assert public_resp.json()[0]["type"] == "booking"


@pytest.mark.asyncio
async def test_orders_only_business_hides_booking_services_publicly(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "pub-orders-only")
    await _activate_business(db_session, ctx["slug"])

    await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json=BOOKING_SERVICE_PAYLOAD,
        headers=ctx["headers"],
    )
    await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json=ORDER_SERVICE_PAYLOAD,
        headers=ctx["headers"],
    )
    await _set_operating_mode(db_session, ctx["slug"], "orders_only")

    public_resp = await async_client.get(f"/api/v1/public/b/{ctx['slug']}/services")
    assert public_resp.status_code == 200
    assert len(public_resp.json()) == 1
    assert public_resp.json()[0]["type"] == "order"


@pytest.mark.asyncio
async def test_both_business_shows_both_service_types_publicly(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "pub-both")
    await _activate_business(db_session, ctx["slug"])

    await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json=BOOKING_SERVICE_PAYLOAD,
        headers=ctx["headers"],
    )
    await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json=ORDER_SERVICE_PAYLOAD,
        headers=ctx["headers"],
    )

    public_resp = await async_client.get(f"/api/v1/public/b/{ctx['slug']}/services")
    assert public_resp.status_code == 200
    types = {s["type"] for s in public_resp.json()}
    assert types == {"booking", "order"}
