import uuid
from datetime import UTC
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.main import app
from app.models.booking import Booking
from app.models.client import Client
from app.models.enums import ClientSource, UserRole
from app.models.order import Order
from app.models.user import User
from app.services.claim_service import contact_matches
from app.services.password_service import hash_password
from tests.test_bookings_availability_blocking import (
    FIXED_NOW,
    SLOT_START,
    _setup_booking_business,
)
from tests.test_public_booking_create import booking_payload
from tests.test_public_order_create import _setup_order_business, order_payload

FIXED_NOW_UTC = FIXED_NOW.astimezone(UTC)


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
        email=f"claim-client-{suffix}@example.com",
        password_hash=hash_password("securePass123"),
        full_name="Claim Client",
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


async def _create_guest_booking(
    async_client: AsyncClient,
    db_session,
    suffix: str,
    *,
    email: str = "guest-booking@example.com",
    phone: str = "+15550101",
) -> dict:
    ctx = await _setup_booking_business(async_client, db_session, suffix)
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"], email=email, phone=phone),
    )
    assert response.status_code == 201
    body = response.json()
    return {
        **ctx,
        "reference": body["reference"],
        "guest_email": email,
        "guest_phone": phone,
        "booking_id": body["id"],
    }


async def _create_guest_order(
    async_client: AsyncClient,
    db_session,
    suffix: str,
    *,
    email: str = "guest-order@example.com",
    phone: str = "+15550202",
) -> dict:
    ctx = await _setup_order_business(async_client, db_session, suffix)
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(ctx["service_id"], email=email, phone=phone),
    )
    assert response.status_code == 201
    body = response.json()
    return {
        **ctx,
        "reference": body["reference"],
        "guest_email": email,
        "guest_phone": phone,
        "order_id": body["id"],
    }


def test_contact_matches_email_only() -> None:
    client = Client(email="guest@example.com", phone="+15550101")
    assert contact_matches(client, email="guest@example.com", phone=None)
    assert not contact_matches(client, email="wrong@example.com", phone=None)


def test_contact_matches_phone_only() -> None:
    client = Client(email="guest@example.com", phone="+15550101")
    assert contact_matches(client, email=None, phone="+15550101")
    assert not contact_matches(client, email=None, phone="+15559999")


def test_contact_matches_email_case_insensitive() -> None:
    client = Client(email="guest@example.com", phone="+15550101")
    assert contact_matches(client, email="Guest@Example.com", phone=None)


@pytest.mark.asyncio
async def test_service_claim_guest_booking_by_email(
    async_client: AsyncClient,
    db_session,
) -> None:
    from app.schemas.claim import ClaimGuestBookingRequest
    from app.services.claim_service import ClaimService

    ctx = await _create_guest_booking(async_client, db_session, "svc-book-email")
    user = await _create_client_user(db_session, "svc-book-email")
    await db_session.commit()

    result = await ClaimService(db_session).claim_guest_booking(
        user,
        ClaimGuestBookingRequest(reference=ctx["reference"], email=ctx["guest_email"]),
    )
    assert result.booking.reference == ctx["reference"]

    client = (
        await db_session.execute(
            select(Client).where(
                Client.business_id == uuid.UUID(ctx["business_id"]),
                Client.email == ctx["guest_email"],
            )
        )
    ).scalar_one()
    assert client.user_id == user.id
    assert client.source == ClientSource.registered


@pytest.mark.asyncio
async def test_service_claim_guest_order_by_phone(
    async_client: AsyncClient,
    db_session,
) -> None:
    from app.schemas.claim import ClaimGuestOrderRequest
    from app.services.claim_service import ClaimService

    ctx = await _create_guest_order(async_client, db_session, "svc-order-phone")
    user = await _create_client_user(db_session, "svc-order-phone")
    await db_session.commit()

    result = await ClaimService(db_session).claim_guest_order(
        user,
        ClaimGuestOrderRequest(reference=ctx["reference"], phone=ctx["guest_phone"]),
    )
    assert result.order.reference == ctx["reference"]

    client = (
        await db_session.execute(
            select(Client).where(
                Client.business_id == uuid.UUID(ctx["business_id"]),
                Client.email == ctx["guest_email"],
            )
        )
    ).scalar_one()
    assert client.user_id == user.id


@pytest.mark.asyncio
async def test_service_claim_fails_for_wrong_contact(
    async_client: AsyncClient,
    db_session,
) -> None:
    from app.exceptions.business import ClaimNotFoundOrMismatchError
    from app.schemas.claim import ClaimGuestBookingRequest
    from app.services.claim_service import ClaimService

    ctx = await _create_guest_booking(async_client, db_session, "svc-book-wrong")
    user = await _create_client_user(db_session, "svc-book-wrong")
    await db_session.commit()

    with pytest.raises(ClaimNotFoundOrMismatchError):
        await ClaimService(db_session).claim_guest_booking(
            user,
            ClaimGuestBookingRequest(
                reference=ctx["reference"],
                email="wrong@example.com",
            ),
        )


@pytest.mark.asyncio
async def test_a_client_can_claim_guest_booking_by_reference_and_email(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _create_guest_booking(async_client, db_session, "route-book-email")
    user = await _create_client_user(db_session, "route-book-email")
    await db_session.commit()
    headers = await _login_client(async_client, user.email)

    response = await async_client.post(
        "/api/v1/me/claims/bookings",
        json={"reference": ctx["reference"], "email": ctx["guest_email"]},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["booking"]["reference"] == ctx["reference"]


@pytest.mark.asyncio
async def test_b_client_can_claim_guest_booking_by_reference_and_phone(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _create_guest_booking(async_client, db_session, "route-book-phone")
    user = await _create_client_user(db_session, "route-book-phone")
    await db_session.commit()
    headers = await _login_client(async_client, user.email)

    response = await async_client.post(
        "/api/v1/me/claims/bookings",
        json={"reference": ctx["reference"], "phone": ctx["guest_phone"]},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["booking"]["reference"] == ctx["reference"]


@pytest.mark.asyncio
async def test_c_after_claim_me_bookings_includes_booking(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _create_guest_booking(async_client, db_session, "route-book-list")
    user = await _create_client_user(db_session, "route-book-list")
    await db_session.commit()
    headers = await _login_client(async_client, user.email)

    claim = await async_client.post(
        "/api/v1/me/claims/bookings",
        json={"reference": ctx["reference"], "email": ctx["guest_email"]},
        headers=headers,
    )
    assert claim.status_code == 200

    listing = await async_client.get(
        "/api/v1/me/bookings",
        params={"status": "upcoming"},
        headers=headers,
    )
    assert listing.status_code == 200
    references = [item["reference"] for item in listing.json()["data"]]
    assert ctx["reference"] in references


@pytest.mark.asyncio
async def test_d_wrong_email_cannot_claim_booking(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _create_guest_booking(async_client, db_session, "route-book-bad-email")
    user = await _create_client_user(db_session, "route-book-bad-email")
    await db_session.commit()
    headers = await _login_client(async_client, user.email)

    response = await async_client.post(
        "/api/v1/me/claims/bookings",
        json={"reference": ctx["reference"], "email": "wrong@example.com"},
        headers=headers,
    )
    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "CLAIM_NOT_FOUND_OR_MISMATCH"
    assert "could not find a matching" in body["error"]["message"].lower()


@pytest.mark.asyncio
async def test_e_already_linked_booking_cannot_be_claimed_by_another_user(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _create_guest_booking(async_client, db_session, "route-book-linked")
    owner = await _create_client_user(db_session, "route-book-linked-owner")
    other = await _create_client_user(db_session, "route-book-linked-other")
    booking = (
        await db_session.execute(
            select(Booking).where(
                Booking.reference == ctx["reference"],
                Booking.business_id == uuid.UUID(ctx["business_id"]),
            )
        )
    ).scalar_one()
    client = (
        await db_session.execute(select(Client).where(Client.id == booking.client_id))
    ).scalar_one()
    client.user_id = owner.id
    client.source = ClientSource.registered
    await db_session.commit()

    headers = await _login_client(async_client, other.email)
    response = await async_client.post(
        "/api/v1/me/claims/bookings",
        json={"reference": ctx["reference"], "email": ctx["guest_email"]},
        headers=headers,
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "CLAIM_ALREADY_LINKED"
    assert "already linked to another account" in response.json()["error"]["message"].lower()


@pytest.mark.asyncio
async def test_e2_claim_is_idempotent_for_same_user(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _create_guest_booking(async_client, db_session, "route-book-idem")
    user = await _create_client_user(db_session, "route-book-idem")
    await db_session.commit()
    headers = await _login_client(async_client, user.email)

    first = await async_client.post(
        "/api/v1/me/claims/bookings",
        json={"reference": ctx["reference"], "email": ctx["guest_email"]},
        headers=headers,
    )
    assert first.status_code == 200
    assert first.json()["already_linked"] is False

    second = await async_client.post(
        "/api/v1/me/claims/bookings",
        json={"reference": ctx["reference"], "email": ctx["guest_email"]},
        headers=headers,
    )
    assert second.status_code == 200
    assert second.json()["already_linked"] is True
    assert second.json()["booking"]["reference"] == ctx["reference"]


@pytest.mark.asyncio
async def test_e3_duplicate_reference_across_businesses_claims_by_contact(
    async_client: AsyncClient,
    db_session,
) -> None:
    """References are unique per business; claiming must not 500 when refs collide."""
    ctx_a = await _create_guest_booking(
        async_client,
        db_session,
        "dup-ref-a",
        email="dup-claim@example.com",
        phone="+15551001",
    )
    ctx_b = await _create_guest_booking(
        async_client,
        db_session,
        "dup-ref-b",
        email="other-guest@example.com",
        phone="+15551002",
    )
    # Force identical references across businesses (production can collide by year+count).
    booking_b = (
        await db_session.execute(
            select(Booking).where(Booking.id == uuid.UUID(ctx_b["booking_id"]))
        )
    ).scalar_one()
    booking_b.reference = ctx_a["reference"]
    await db_session.commit()

    user = await _create_client_user(db_session, "dup-ref-claim")
    await db_session.commit()
    headers = await _login_client(async_client, user.email)

    response = await async_client.post(
        "/api/v1/me/claims/bookings",
        json={"reference": ctx_a["reference"], "email": "dup-claim@example.com"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["booking"]["reference"] == ctx_a["reference"]
    assert response.json()["booking"]["id"] == ctx_a["booking_id"]

    listing = await async_client.get(
        "/api/v1/me/bookings",
        params={"status": "upcoming"},
        headers=headers,
    )
    assert listing.status_code == 200
    data = listing.json()["data"]
    assert any(item["id"] == ctx_a["booking_id"] for item in data)
    assert all(item["id"] != ctx_b["booking_id"] for item in data)
    assert all(item["status"] == "pending" for item in data if item["id"] == ctx_a["booking_id"])


@pytest.mark.asyncio
async def test_e4_same_contact_duplicate_reference_is_ambiguous_without_business(
    async_client: AsyncClient,
    db_session,
) -> None:
    shared_email = "ambig-claim@example.com"
    ctx_a = await _create_guest_booking(
        async_client,
        db_session,
        "ambig-a",
        email=shared_email,
        phone="+15551101",
    )
    ctx_b = await _create_guest_booking(
        async_client,
        db_session,
        "ambig-b",
        email=shared_email,
        phone="+15551102",
    )
    booking_b = (
        await db_session.execute(
            select(Booking).where(Booking.id == uuid.UUID(ctx_b["booking_id"]))
        )
    ).scalar_one()
    booking_b.reference = ctx_a["reference"]
    await db_session.commit()

    user = await _create_client_user(db_session, "ambig-claim")
    await db_session.commit()
    headers = await _login_client(async_client, user.email)

    response = await async_client.post(
        "/api/v1/me/claims/bookings",
        json={"reference": ctx_a["reference"], "email": shared_email},
        headers=headers,
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "CLAIM_AMBIGUOUS"


@pytest.mark.asyncio
async def test_e5_business_scoped_order_claim_links_only_intended_request(
    async_client: AsyncClient,
    db_session,
) -> None:
    shared_email = "scoped-order@example.com"
    ctx_a = await _create_guest_order(
        async_client,
        db_session,
        "scoped-ord-a",
        email=shared_email,
        phone="+15551201",
    )
    ctx_b = await _create_guest_order(
        async_client,
        db_session,
        "scoped-ord-b",
        email=shared_email,
        phone="+15551202",
    )
    order_b = (
        await db_session.execute(
            select(Order).where(Order.id == uuid.UUID(ctx_b["order_id"]))
        )
    ).scalar_one()
    order_b.reference = ctx_a["reference"]
    await db_session.commit()

    user = await _create_client_user(db_session, "scoped-ord")
    await db_session.commit()
    headers = await _login_client(async_client, user.email)

    response = await async_client.post(
        "/api/v1/me/claims/orders",
        json={
            "reference": ctx_a["reference"],
            "email": shared_email,
            "business_slug": ctx_a["slug"],
        },
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["order"]["id"] == ctx_a["order_id"]
    assert response.json()["order"]["status"] == "submitted"

    listing = await async_client.get(
        "/api/v1/me/orders",
        params={"status": "active"},
        headers=headers,
    )
    assert listing.status_code == 200
    ids = [item["id"] for item in listing.json()["data"]]
    assert ctx_a["order_id"] in ids
    assert ctx_b["order_id"] not in ids


@pytest.mark.asyncio
async def test_e6_shared_guest_client_links_prior_orders_for_same_business(
    async_client: AsyncClient,
    db_session,
) -> None:
    """Claiming one order links the shared Client row, so prior same-contact orders appear."""
    email = "shared-client-orders@example.com"
    phone = "+15551301"
    ctx = await _setup_order_business(async_client, db_session, "shared-cli")
    first = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(ctx["service_id"], email=email, phone=phone),
    )
    assert first.status_code == 201
    second = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(ctx["service_id"], email=email, phone=phone),
    )
    assert second.status_code == 201
    first_body = first.json()
    second_body = second.json()

    user = await _create_client_user(db_session, "shared-cli")
    await db_session.commit()
    headers = await _login_client(async_client, user.email)

    claim = await async_client.post(
        "/api/v1/me/claims/orders",
        json={
            "reference": second_body["reference"],
            "email": email,
            "business_slug": ctx["slug"],
        },
        headers=headers,
    )
    assert claim.status_code == 200

    listing = await async_client.get(
        "/api/v1/me/orders",
        params={"status": "active"},
        headers=headers,
    )
    assert listing.status_code == 200
    ids = {item["id"] for item in listing.json()["data"]}
    assert first_body["id"] in ids
    assert second_body["id"] in ids


@pytest.mark.asyncio
async def test_f_missing_email_and_phone_returns_validation_error(
    async_client: AsyncClient,
    db_session,
) -> None:
    user = await _create_client_user(db_session, "route-book-validate")
    await db_session.commit()
    headers = await _login_client(async_client, user.email)

    response = await async_client.post(
        "/api/v1/me/claims/bookings",
        json={"reference": "BKG-2026-000001"},
        headers=headers,
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_g_client_can_claim_guest_order_by_reference_and_email(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _create_guest_order(async_client, db_session, "route-order-email")
    user = await _create_client_user(db_session, "route-order-email")
    await db_session.commit()
    headers = await _login_client(async_client, user.email)

    response = await async_client.post(
        "/api/v1/me/claims/orders",
        json={"reference": ctx["reference"], "email": ctx["guest_email"]},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["order"]["reference"] == ctx["reference"]


@pytest.mark.asyncio
async def test_h_client_can_claim_guest_order_by_reference_and_phone(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _create_guest_order(async_client, db_session, "route-order-phone")
    user = await _create_client_user(db_session, "route-order-phone")
    await db_session.commit()
    headers = await _login_client(async_client, user.email)

    response = await async_client.post(
        "/api/v1/me/claims/orders",
        json={"reference": ctx["reference"], "phone": ctx["guest_phone"]},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["order"]["reference"] == ctx["reference"]


@pytest.mark.asyncio
async def test_i_after_claim_me_orders_includes_order(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _create_guest_order(async_client, db_session, "route-order-list")
    user = await _create_client_user(db_session, "route-order-list")
    await db_session.commit()
    headers = await _login_client(async_client, user.email)

    claim = await async_client.post(
        "/api/v1/me/claims/orders",
        json={"reference": ctx["reference"], "email": ctx["guest_email"]},
        headers=headers,
    )
    assert claim.status_code == 200

    listing = await async_client.get(
        "/api/v1/me/orders",
        params={"status": "active"},
        headers=headers,
    )
    assert listing.status_code == 200
    references = [item["reference"] for item in listing.json()["data"]]
    assert ctx["reference"] in references


@pytest.mark.asyncio
async def test_j_wrong_phone_cannot_claim_order(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _create_guest_order(async_client, db_session, "route-order-bad-phone")
    user = await _create_client_user(db_session, "route-order-bad-phone")
    await db_session.commit()
    headers = await _login_client(async_client, user.email)

    response = await async_client.post(
        "/api/v1/me/claims/orders",
        json={"reference": ctx["reference"], "phone": "+15559999"},
        headers=headers,
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "CLAIM_NOT_FOUND_OR_MISMATCH"


@pytest.mark.asyncio
async def test_k_already_linked_order_cannot_be_claimed_by_another_user(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _create_guest_order(async_client, db_session, "route-order-linked")
    owner = await _create_client_user(db_session, "route-order-linked-owner")
    other = await _create_client_user(db_session, "route-order-linked-other")
    order = (
        await db_session.execute(
            select(Order).where(
                Order.reference == ctx["reference"],
                Order.business_id == uuid.UUID(ctx["business_id"]),
            )
        )
    ).scalar_one()
    client = (
        await db_session.execute(select(Client).where(Client.id == order.client_id))
    ).scalar_one()
    client.user_id = owner.id
    client.source = ClientSource.registered
    await db_session.commit()

    headers = await _login_client(async_client, other.email)
    response = await async_client.post(
        "/api/v1/me/claims/orders",
        json={"reference": ctx["reference"], "email": ctx["guest_email"]},
        headers=headers,
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "CLAIM_ALREADY_LINKED"


@pytest.mark.asyncio
async def test_l_claim_endpoints_require_authentication(
    async_client: AsyncClient,
) -> None:
    booking_response = await async_client.post(
        "/api/v1/me/claims/bookings",
        json={"reference": "BKG-2026-000001", "email": "guest@example.com"},
    )
    assert booking_response.status_code == 401

    order_response = await async_client.post(
        "/api/v1/me/claims/orders",
        json={"reference": "ORD-2026-000001", "email": "guest@example.com"},
    )
    assert order_response.status_code == 401


def test_m_openapi_includes_claim_endpoints() -> None:
    paths = app.openapi()["paths"]
    assert "/api/v1/me/claims/bookings" in paths
    assert "post" in paths["/api/v1/me/claims/bookings"]
    assert "/api/v1/me/claims/orders" in paths
    assert "post" in paths["/api/v1/me/claims/orders"]
