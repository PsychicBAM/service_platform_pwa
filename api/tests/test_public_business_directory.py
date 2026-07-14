from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import update

from app.models.business import Business
from app.models.enums import BusinessStatus
from tests.conftest import BOOKING_SERVICE_PAYLOAD, activate_business, register_and_get_context
from tests.test_bookings_availability_blocking import FIXED_NOW, _setup_booking_business
from tests.test_public_booking_create import booking_payload
from tests.test_reviews import _create_completed_booking


async def _setup_active_business_with_service(async_client: AsyncClient, db_session, slug_prefix: str) -> dict:
    ctx = await register_and_get_context(async_client, slug_prefix)
    await activate_business(db_session, ctx["slug"])
    service_resp = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json=BOOKING_SERVICE_PAYLOAD,
        headers=ctx["headers"],
    )
    assert service_resp.status_code == 201
    ctx["service_id"] = service_resp.json()["id"]
    return ctx


async def _set_business_name(db_session, slug: str, name: str) -> None:
    await db_session.execute(update(Business).where(Business.slug == slug).values(name=name))
    await db_session.commit()
    db_session.expire_all()


@pytest.mark.asyncio
async def test_public_directory_returns_only_active_businesses(
    async_client: AsyncClient,
    db_session,
) -> None:
    active_ctx = await _setup_active_business_with_service(async_client, db_session, "dir-active")
    pending_ctx = await register_and_get_context(async_client, "dir-pending")

    response = await async_client.get("/api/v1/public/businesses")
    assert response.status_code == 200
    body = response.json()
    slugs = {item["slug"] for item in body["data"]}
    assert active_ctx["slug"] in slugs
    assert pending_ctx["slug"] not in slugs


@pytest.mark.asyncio
async def test_public_directory_includes_rating_and_service_preview(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "dir-rating-preview")
    await _set_business_name(db_session, ctx["slug"], "Directory Rating Preview Clinic")
    with patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW):
        booking = await _create_completed_booking(async_client, ctx)
        review = await async_client.post(
            f"/api/v1/public/b/{ctx['slug']}/reviews",
            json={
                "booking_reference": booking["reference"],
                "email": booking["client"]["email"],
                "rating": 5,
                "comment": "Excellent",
            },
        )
        assert review.status_code == 201

    response = await async_client.get("/api/v1/public/businesses?q=Directory+Rating+Preview")
    assert response.status_code == 200
    body = response.json()
    assert body["meta"]["total"] >= 1
    item = next(row for row in body["data"] if row["slug"] == ctx["slug"])
    assert item["average_rating"] == 5.0
    assert item["review_count"] == 1
    assert len(item["services_preview"]) >= 1
    assert item["services_preview"][0]["name"]
    assert item["has_booking_service"] is True


@pytest.mark.asyncio
async def test_public_directory_excludes_private_fields(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_active_business_with_service(async_client, db_session, "dir-private")
    await _set_business_name(db_session, ctx["slug"], "Directory Private Fields Biz")
    await db_session.execute(
        update(Business)
        .where(Business.slug == ctx["slug"])
        .values(
            contact_email="secret@example.com",
            contact_phone="+15551234567",
            settings={"admin_notes": "internal only"},
        )
    )
    await db_session.commit()
    db_session.expire_all()

    response = await async_client.get("/api/v1/public/businesses?q=Directory+Private+Fields")
    assert response.status_code == 200
    item = next(row for row in response.json()["data"] if row["slug"] == ctx["slug"])
    assert "contact_email" not in item
    assert "contact_phone" not in item
    assert "settings" not in item
    assert "id" not in item
    assert "admin_notes" not in str(item)


@pytest.mark.asyncio
async def test_public_directory_search_by_business_name(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_active_business_with_service(async_client, db_session, "dir-search-name")
    await db_session.execute(
        update(Business)
        .where(Business.slug == ctx["slug"])
        .values(name="Unique Dental Clinic Search")
    )
    await db_session.commit()
    db_session.expire_all()

    response = await async_client.get("/api/v1/public/businesses?q=Unique+Dental")
    assert response.status_code == 200
    slugs = {item["slug"] for item in response.json()["data"]}
    assert ctx["slug"] in slugs


@pytest.mark.asyncio
async def test_public_directory_search_by_service_name(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "dir-search-service")
    await activate_business(db_session, ctx["slug"])
    service_resp = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json={**BOOKING_SERVICE_PAYLOAD, "name": "Special Maths Tutoring"},
        headers=ctx["headers"],
    )
    assert service_resp.status_code == 201

    response = await async_client.get("/api/v1/public/businesses?q=Maths+Tutoring")
    assert response.status_code == 200
    slugs = {item["slug"] for item in response.json()["data"]}
    assert ctx["slug"] in slugs


@pytest.mark.asyncio
async def test_public_directory_rating_filter(
    async_client: AsyncClient,
    db_session,
) -> None:
    high_ctx = await _setup_booking_business(async_client, db_session, "dir-rating-filter-high")
    low_ctx = await _setup_booking_business(async_client, db_session, "dir-rating-filter-low")
    await _set_business_name(db_session, high_ctx["slug"], "Directory High Rating Studio")
    await _set_business_name(db_session, low_ctx["slug"], "Directory Low Rating Studio")
    with patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW):
        high_booking = await _create_completed_booking(async_client, high_ctx)
        low_booking = await _create_completed_booking(async_client, low_ctx)
        high_review = await async_client.post(
            f"/api/v1/public/b/{high_ctx['slug']}/reviews",
            json={
                "booking_reference": high_booking["reference"],
                "email": high_booking["client"]["email"],
                "rating": 5,
            },
        )
        low_review = await async_client.post(
            f"/api/v1/public/b/{low_ctx['slug']}/reviews",
            json={
                "booking_reference": low_booking["reference"],
                "email": low_booking["client"]["email"],
                "rating": 2,
            },
        )
        assert high_review.status_code == 201
        assert low_review.status_code == 201

    response = await async_client.get(
        "/api/v1/public/businesses?rating_min=4&q=Directory+High+Rating+Studio"
    )
    assert response.status_code == 200
    slugs = {item["slug"] for item in response.json()["data"]}
    assert high_ctx["slug"] in slugs

    low_response = await async_client.get(
        "/api/v1/public/businesses?rating_min=4&q=Directory+Low+Rating+Studio"
    )
    assert low_response.status_code == 200
    assert not any(item["slug"] == low_ctx["slug"] for item in low_response.json()["data"])


@pytest.mark.asyncio
async def test_public_directory_sort_by_name(
    async_client: AsyncClient,
    db_session,
) -> None:
    first = await _setup_active_business_with_service(async_client, db_session, "dir-sort-a")
    second = await _setup_active_business_with_service(async_client, db_session, "dir-sort-b")
    await db_session.execute(
        update(Business).where(Business.slug == first["slug"]).values(name="Alpha Directory Biz")
    )
    await db_session.execute(
        update(Business).where(Business.slug == second["slug"]).values(name="Zulu Directory Biz")
    )
    await db_session.commit()
    db_session.expire_all()

    response = await async_client.get("/api/v1/public/businesses?sort=name&limit=50&q=Directory+Biz")
    assert response.status_code == 200
    names = [item["name"] for item in response.json()["data"] if "Directory Biz" in item["name"]]
    assert names.index("Alpha Directory Biz") < names.index("Zulu Directory Biz")


@pytest.mark.asyncio
async def test_public_directory_empty_result(
    async_client: AsyncClient,
) -> None:
    response = await async_client.get("/api/v1/public/businesses?q=__no_such_business_xyz__")
    assert response.status_code == 200
    body = response.json()
    assert body["data"] == []
    assert body["meta"]["total"] == 0


@pytest.mark.asyncio
async def test_public_directory_excludes_inactive_business_even_with_active_status_change(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_active_business_with_service(async_client, db_session, "dir-deactivate")
    await _set_business_name(db_session, ctx["slug"], "Directory Deactivate Biz")
    await db_session.execute(
        update(Business)
        .where(Business.slug == ctx["slug"])
        .values(status=BusinessStatus.suspended)
    )
    await db_session.commit()
    db_session.expire_all()

    response = await async_client.get("/api/v1/public/businesses?q=Directory+Deactivate+Biz")
    assert response.status_code == 200
    assert not any(item["slug"] == ctx["slug"] for item in response.json()["data"])
