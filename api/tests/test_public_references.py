"""Global short public references for bookings and requests."""

from __future__ import annotations

import re
import uuid
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.models.booking import Booking
from app.models.client import Client
from app.models.enums import ClientSource, UserRole
from app.models.order import Order
from app.models.user import User
from app.services.password_service import hash_password
from app.utils.references import next_public_reference
from tests.test_bookings_availability_blocking import (
    FIXED_NOW,
    _setup_booking_business,
)
from tests.test_guest_claim_routes import FIXED_NOW_UTC
from tests.test_public_booking_create import booking_payload
from tests.test_public_order_create import _setup_order_business, order_payload

BOOKING_REF_RE = re.compile(r"^BKG-26-\d{4}$")
REQUEST_REF_RE = re.compile(r"^REQ-26-\d{4}$")


@pytest.fixture(autouse=True)
def fixed_booking_time():
    with (
        patch(
            "app.repositories.booking_repository._now_utc",
            return_value=FIXED_NOW_UTC,
        ),
        patch(
            "app.services.client_booking_service._now_utc",
            return_value=FIXED_NOW_UTC,
        ),
        patch(
            "app.services.availability_service._now_in_tz",
            return_value=FIXED_NOW,
        ),
    ):
        yield


async def _create_client_user(db_session, suffix: str) -> User:
    user = User(
        email=f"ref-client-{suffix}@example.com",
        password_hash=hash_password("securePass123"),
        full_name="Ref Client",
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


@pytest.mark.asyncio
async def test_new_booking_reference_format(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "ref-bkg-fmt")
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"], email="bkg-fmt@example.com"),
    )
    assert response.status_code == 201
    assert BOOKING_REF_RE.fullmatch(response.json()["reference"])


@pytest.mark.asyncio
async def test_booking_references_are_global_across_businesses(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx_a = await _setup_booking_business(async_client, db_session, "ref-bkg-a")
    ctx_b = await _setup_booking_business(async_client, db_session, "ref-bkg-b")

    first = await async_client.post(
        f"/api/v1/public/b/{ctx_a['slug']}/bookings",
        json=booking_payload(ctx_a["service_id"], email="bkg-a@example.com"),
    )
    second = await async_client.post(
        f"/api/v1/public/b/{ctx_b['slug']}/bookings",
        json=booking_payload(ctx_b["service_id"], email="bkg-b@example.com"),
    )
    assert first.status_code == 201
    assert second.status_code == 201
    ref_a = first.json()["reference"]
    ref_b = second.json()["reference"]
    assert BOOKING_REF_RE.fullmatch(ref_a)
    assert BOOKING_REF_RE.fullmatch(ref_b)
    assert ref_a != ref_b
    assert int(ref_b.rsplit("-", 1)[-1]) == int(ref_a.rsplit("-", 1)[-1]) + 1


@pytest.mark.asyncio
async def test_new_request_reference_format(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "ref-req-fmt")
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(ctx["service_id"], email="req-fmt@example.com"),
    )
    assert response.status_code == 201
    assert REQUEST_REF_RE.fullmatch(response.json()["reference"])


@pytest.mark.asyncio
async def test_request_references_are_global_across_businesses(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx_a = await _setup_order_business(async_client, db_session, "ref-req-a")
    ctx_b = await _setup_order_business(async_client, db_session, "ref-req-b")

    first = await async_client.post(
        f"/api/v1/public/b/{ctx_a['slug']}/orders",
        json=order_payload(ctx_a["service_id"], email="req-a@example.com"),
    )
    second = await async_client.post(
        f"/api/v1/public/b/{ctx_b['slug']}/orders",
        json=order_payload(ctx_b["service_id"], email="req-b@example.com"),
    )
    assert first.status_code == 201
    assert second.status_code == 201
    ref_a = first.json()["reference"]
    ref_b = second.json()["reference"]
    assert REQUEST_REF_RE.fullmatch(ref_a)
    assert REQUEST_REF_RE.fullmatch(ref_b)
    assert ref_a != ref_b
    assert int(ref_b.rsplit("-", 1)[-1]) == int(ref_a.rsplit("-", 1)[-1]) + 1


@pytest.mark.asyncio
async def test_booking_and_request_sequences_are_separate(
    async_client: AsyncClient,
    db_session,
) -> None:
    booking_ctx = await _setup_booking_business(async_client, db_session, "ref-sep-bkg")
    order_ctx = await _setup_order_business(async_client, db_session, "ref-sep-req")

    booking = await async_client.post(
        f"/api/v1/public/b/{booking_ctx['slug']}/bookings",
        json=booking_payload(booking_ctx["service_id"], email="sep-bkg@example.com"),
    )
    request = await async_client.post(
        f"/api/v1/public/b/{order_ctx['slug']}/orders",
        json=order_payload(order_ctx["service_id"], email="sep-req@example.com"),
    )
    assert booking.status_code == 201
    assert request.status_code == 201
    assert booking.json()["reference"] == "BKG-26-0001"
    assert request.json()["reference"] == "REQ-26-0001"


@pytest.mark.asyncio
async def test_next_public_reference_year_rollover(db_session, clean_auth_tables) -> None:
    first = await next_public_reference(db_session, "booking", year=2026)
    second = await next_public_reference(db_session, "booking", year=2027)
    assert first == "BKG-26-0001"
    assert second == "BKG-27-0001"


@pytest.mark.asyncio
async def test_claim_old_and_new_booking_references(
    async_client: AsyncClient,
    db_session,
) -> None:
    new_ctx = await _setup_booking_business(async_client, db_session, "ref-claim-new")
    old_ctx = await _setup_booking_business(async_client, db_session, "ref-claim-old")

    new_resp = await async_client.post(
        f"/api/v1/public/b/{new_ctx['slug']}/bookings",
        json=booking_payload(
            new_ctx["service_id"],
            email="claim-new-bkg@example.com",
            phone="+15553001",
        ),
    )
    assert new_resp.status_code == 201
    new_ref = new_resp.json()["reference"]
    assert BOOKING_REF_RE.fullmatch(new_ref)

    old_resp = await async_client.post(
        f"/api/v1/public/b/{old_ctx['slug']}/bookings",
        json=booking_payload(
            old_ctx["service_id"],
            email="claim-old-bkg@example.com",
            phone="+15553002",
        ),
    )
    assert old_resp.status_code == 201
    old_booking = (
        await db_session.execute(
            select(Booking).where(Booking.id == uuid.UUID(old_resp.json()["id"]))
        )
    ).scalar_one()
    old_booking.reference = "BKG-2026-0001"
    await db_session.commit()

    user = await _create_client_user(db_session, "claim-bkg")
    await db_session.commit()
    headers = await _login_client(async_client, user.email)

    new_claim = await async_client.post(
        "/api/v1/me/claims/bookings",
        json={"reference": new_ref, "email": "claim-new-bkg@example.com"},
        headers=headers,
    )
    assert new_claim.status_code == 200
    assert new_claim.json()["booking"]["reference"] == new_ref

    old_claim = await async_client.post(
        "/api/v1/me/claims/bookings",
        json={"reference": "BKG-2026-0001", "email": "claim-old-bkg@example.com"},
        headers=headers,
    )
    assert old_claim.status_code == 200
    assert old_claim.json()["booking"]["reference"] == "BKG-2026-0001"


@pytest.mark.asyncio
async def test_claim_old_and_new_request_references(
    async_client: AsyncClient,
    db_session,
) -> None:
    new_ctx = await _setup_order_business(async_client, db_session, "ref-claim-req-n")
    old_ctx = await _setup_order_business(async_client, db_session, "ref-claim-req-o")

    new_resp = await async_client.post(
        f"/api/v1/public/b/{new_ctx['slug']}/orders",
        json=order_payload(
            new_ctx["service_id"],
            email="claim-new-req@example.com",
            phone="+15553003",
        ),
    )
    assert new_resp.status_code == 201
    new_ref = new_resp.json()["reference"]
    assert REQUEST_REF_RE.fullmatch(new_ref)

    old_resp = await async_client.post(
        f"/api/v1/public/b/{old_ctx['slug']}/orders",
        json=order_payload(
            old_ctx["service_id"],
            email="claim-old-req@example.com",
            phone="+15553004",
        ),
    )
    assert old_resp.status_code == 201
    old_order = (
        await db_session.execute(
            select(Order).where(Order.id == uuid.UUID(old_resp.json()["id"]))
        )
    ).scalar_one()
    old_order.reference = "ORD-2026-0001"
    await db_session.commit()

    user = await _create_client_user(db_session, "claim-req")
    await db_session.commit()
    headers = await _login_client(async_client, user.email)

    new_claim = await async_client.post(
        "/api/v1/me/claims/orders",
        json={"reference": new_ref, "email": "claim-new-req@example.com"},
        headers=headers,
    )
    assert new_claim.status_code == 200
    assert new_claim.json()["order"]["reference"] == new_ref

    old_claim = await async_client.post(
        "/api/v1/me/claims/orders",
        json={"reference": "ORD-2026-0001", "email": "claim-old-req@example.com"},
        headers=headers,
    )
    assert old_claim.status_code == 200
    assert old_claim.json()["order"]["reference"] == "ORD-2026-0001"


@pytest.mark.asyncio
async def test_authenticated_client_auto_link_still_works(
    async_client: AsyncClient,
    db_session,
) -> None:
    email = "autolink-ref@example.com"
    user = User(
        email=email,
        password_hash=hash_password("securePass123"),
        full_name="Autolink Client",
        role=UserRole.client,
    )
    db_session.add(user)
    await db_session.commit()
    headers = await _login_client(async_client, email)

    booking_ctx = await _setup_booking_business(async_client, db_session, "ref-alink-b")
    order_ctx = await _setup_order_business(async_client, db_session, "ref-alink-o")

    booking = await async_client.post(
        f"/api/v1/public/b/{booking_ctx['slug']}/bookings",
        json=booking_payload(booking_ctx["service_id"], email=email, phone="+15554001"),
        headers=headers,
    )
    order = await async_client.post(
        f"/api/v1/public/b/{order_ctx['slug']}/orders",
        json=order_payload(order_ctx["service_id"], email=email, phone="+15554002"),
        headers=headers,
    )
    assert booking.status_code == 201
    assert order.status_code == 201
    assert booking.json()["linked_to_account"] is True
    assert order.json()["linked_to_account"] is True
    assert BOOKING_REF_RE.fullmatch(booking.json()["reference"])
    assert REQUEST_REF_RE.fullmatch(order.json()["reference"])

    bookings = await async_client.get(
        "/api/v1/me/bookings",
        params={"status": "upcoming"},
        headers=headers,
    )
    orders = await async_client.get("/api/v1/me/orders", headers=headers)
    assert any(item["id"] == booking.json()["id"] for item in bookings.json()["data"])
    assert any(item["id"] == order.json()["id"] for item in orders.json()["data"])


@pytest.mark.asyncio
async def test_guest_flow_still_creates_unlinked_client(
    async_client: AsyncClient,
    db_session,
) -> None:
    email = "guest-ref@example.com"
    ctx = await _setup_booking_business(async_client, db_session, "ref-guest")
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"], email=email, phone="+15555001"),
    )
    assert response.status_code == 201
    assert "linked_to_account" not in response.json()
    assert BOOKING_REF_RE.fullmatch(response.json()["reference"])

    client = (
        await db_session.execute(
            select(Client).where(
                Client.business_id == uuid.UUID(ctx["business_id"]),
                Client.email == email,
            )
        )
    ).scalar_one()
    assert client.user_id is None
    assert client.source == ClientSource.guest
