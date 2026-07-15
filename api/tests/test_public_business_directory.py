from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import update

from app.models.business import Business
from app.models.enums import BusinessStatus
from tests.conftest import BOOKING_SERVICE_PAYLOAD, ORDER_SERVICE_PAYLOAD, activate_business, register_and_get_context
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


async def _setup_order_only_business(async_client: AsyncClient, db_session, slug_prefix: str) -> dict:
    ctx = await register_and_get_context(async_client, slug_prefix)
    await activate_business(db_session, ctx["slug"])
    service_resp = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json=ORDER_SERVICE_PAYLOAD,
        headers=ctx["headers"],
    )
    assert service_resp.status_code == 201
    ctx["service_id"] = service_resp.json()["id"]
    return ctx


@pytest.mark.asyncio
async def test_public_directory_bookable_filter(
    async_client: AsyncClient,
    db_session,
) -> None:
    booking_ctx = await _setup_active_business_with_service(async_client, db_session, "dir-filter-bookable")
    order_ctx = await _setup_order_only_business(async_client, db_session, "dir-filter-order-only")
    await _set_business_name(db_session, booking_ctx["slug"], "Directory Bookable Filter Studio")
    await _set_business_name(db_session, order_ctx["slug"], "Directory Order Only Filter Studio")

    response = await async_client.get(
        "/api/v1/public/businesses?bookable=true&q=Directory+Bookable+Filter+Studio"
    )
    assert response.status_code == 200
    slugs = {item["slug"] for item in response.json()["data"]}
    assert booking_ctx["slug"] in slugs
    assert order_ctx["slug"] not in slugs


@pytest.mark.asyncio
async def test_public_directory_requests_filter(
    async_client: AsyncClient,
    db_session,
) -> None:
    booking_ctx = await _setup_active_business_with_service(async_client, db_session, "dir-filter-booking-only")
    order_ctx = await _setup_order_only_business(async_client, db_session, "dir-filter-requests")
    await _set_business_name(db_session, booking_ctx["slug"], "Directory Booking Only Filter Studio")
    await _set_business_name(db_session, order_ctx["slug"], "Directory Requests Filter Studio")

    response = await async_client.get(
        "/api/v1/public/businesses?requests=true&q=Directory+Requests+Filter+Studio"
    )
    assert response.status_code == 200
    slugs = {item["slug"] for item in response.json()["data"]}
    assert order_ctx["slug"] in slugs
    assert booking_ctx["slug"] not in slugs


@pytest.mark.asyncio
async def test_public_directory_reviews_filter(
    async_client: AsyncClient,
    db_session,
) -> None:
    reviewed_ctx = await _setup_booking_business(async_client, db_session, "dir-filter-reviewed")
    plain_ctx = await _setup_active_business_with_service(async_client, db_session, "dir-filter-no-reviews")
    await _set_business_name(db_session, reviewed_ctx["slug"], "Directory Reviewed Filter Studio")
    await _set_business_name(db_session, plain_ctx["slug"], "Directory No Reviews Filter Studio")
    with patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW):
        booking = await _create_completed_booking(async_client, reviewed_ctx)
        review = await async_client.post(
            f"/api/v1/public/b/{reviewed_ctx['slug']}/reviews",
            json={
                "booking_reference": booking["reference"],
                "email": booking["client"]["email"],
                "rating": 5,
            },
        )
        assert review.status_code == 201

    response = await async_client.get(
        "/api/v1/public/businesses?reviews=true&q=Directory+Reviewed+Filter+Studio"
    )
    assert response.status_code == 200
    slugs = {item["slug"] for item in response.json()["data"]}
    assert reviewed_ctx["slug"] in slugs
    assert plain_ctx["slug"] not in slugs


@pytest.mark.asyncio
async def test_public_directory_cover_filter(
    async_client: AsyncClient,
    db_session,
) -> None:
    covered_ctx = await _setup_active_business_with_service(async_client, db_session, "dir-filter-cover")
    plain_ctx = await _setup_active_business_with_service(async_client, db_session, "dir-filter-no-cover")
    await _set_business_name(db_session, covered_ctx["slug"], "Directory Cover Filter Studio")
    await _set_business_name(db_session, plain_ctx["slug"], "Directory No Cover Filter Studio")
    await db_session.execute(
        update(Business)
        .where(Business.slug == covered_ctx["slug"])
        .values(
            settings={
                "marketplace_cover_image": {
                    "kind": "image",
                    "url": "/uploads/businesses/test/cover.webp",
                    "thumbnail_url": "/uploads/businesses/test/cover_thumb.webp",
                }
            }
        )
    )
    await db_session.commit()
    db_session.expire_all()

    response = await async_client.get(
        "/api/v1/public/businesses?cover=true&q=Directory+Cover+Filter+Studio"
    )
    assert response.status_code == 200
    slugs = {item["slug"] for item in response.json()["data"]}
    assert covered_ctx["slug"] in slugs
    assert plain_ctx["slug"] not in slugs


@pytest.mark.asyncio
async def test_public_directory_sidebar_filters_combine_with_search_and_sort(
    async_client: AsyncClient,
    db_session,
) -> None:
    first = await _setup_active_business_with_service(async_client, db_session, "dir-combo-filter-a")
    second = await _setup_order_only_business(async_client, db_session, "dir-combo-filter-b")
    await _set_business_name(db_session, first["slug"], "Alpha Combo Filter Studio")
    await _set_business_name(db_session, second["slug"], "Zulu Combo Filter Studio")

    response = await async_client.get(
        "/api/v1/public/businesses?bookable=true&q=Combo+Filter&sort=name&limit=50"
    )
    assert response.status_code == 200
    names = [item["name"] for item in response.json()["data"] if "Combo Filter Studio" in item["name"]]
    assert names == ["Alpha Combo Filter Studio"]
    assert "contact_email" not in response.json()["data"][0]


@pytest.mark.asyncio
async def test_public_directory_sort_by_rating_orders_highest_first(
    async_client: AsyncClient,
    db_session,
) -> None:
    high_ctx = await _setup_booking_business(async_client, db_session, "dir-sort-rating-high")
    low_ctx = await _setup_booking_business(async_client, db_session, "dir-sort-rating-low")
    await _set_business_name(db_session, high_ctx["slug"], "High Rating Sort Studio")
    await _set_business_name(db_session, low_ctx["slug"], "Low Rating Sort Studio")
    with patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW):
        high_booking = await _create_completed_booking(async_client, high_ctx)
        low_booking = await _create_completed_booking(async_client, low_ctx)
        assert (
            await async_client.post(
                f"/api/v1/public/b/{high_ctx['slug']}/reviews",
                json={
                    "booking_reference": high_booking["reference"],
                    "email": high_booking["client"]["email"],
                    "rating": 5,
                },
            )
        ).status_code == 201
        assert (
            await async_client.post(
                f"/api/v1/public/b/{low_ctx['slug']}/reviews",
                json={
                    "booking_reference": low_booking["reference"],
                    "email": low_booking["client"]["email"],
                    "rating": 2,
                },
            )
        ).status_code == 201

    response = await async_client.get(
        "/api/v1/public/businesses?sort=rating&q=Rating+Sort+Studio&limit=50"
    )
    assert response.status_code == 200
    names = [item["name"] for item in response.json()["data"] if "Rating Sort Studio" in item["name"]]
    assert names.index("High Rating Sort Studio") < names.index("Low Rating Sort Studio")


@pytest.mark.asyncio
async def test_public_directory_sort_by_reviews_orders_most_reviewed_first(
    async_client: AsyncClient,
    db_session,
) -> None:
    reviewed_ctx = await _setup_booking_business(async_client, db_session, "dir-sort-reviews-yes")
    plain_ctx = await _setup_active_business_with_service(async_client, db_session, "dir-sort-reviews-no")
    await _set_business_name(db_session, reviewed_ctx["slug"], "Reviewed Sort Studio")
    await _set_business_name(db_session, plain_ctx["slug"], "Plain Sort Studio")
    with patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW):
        booking = await _create_completed_booking(async_client, reviewed_ctx)
        assert (
            await async_client.post(
                f"/api/v1/public/b/{reviewed_ctx['slug']}/reviews",
                json={
                    "booking_reference": booking["reference"],
                    "email": booking["client"]["email"],
                    "rating": 4,
                },
            )
        ).status_code == 201

    response = await async_client.get(
        "/api/v1/public/businesses?sort=reviews&q=Sort+Studio&limit=50"
    )
    assert response.status_code == 200
    names = [item["name"] for item in response.json()["data"] if item["name"].endswith("Sort Studio")]
    assert names.index("Reviewed Sort Studio") < names.index("Plain Sort Studio")


@pytest.mark.asyncio
async def test_public_directory_sort_by_newest_orders_recent_first(
    async_client: AsyncClient,
    db_session,
) -> None:
    from datetime import UTC, datetime

    older_ctx = await _setup_active_business_with_service(async_client, db_session, "dir-sort-newest-old")
    newer_ctx = await _setup_active_business_with_service(async_client, db_session, "dir-sort-newest-new")
    await _set_business_name(db_session, older_ctx["slug"], "Older Newest Sort Studio")
    await _set_business_name(db_session, newer_ctx["slug"], "Newer Newest Sort Studio")
    await db_session.execute(
        update(Business)
        .where(Business.slug == older_ctx["slug"])
        .values(created_at=datetime(2024, 1, 1, tzinfo=UTC))
    )
    await db_session.execute(
        update(Business)
        .where(Business.slug == newer_ctx["slug"])
        .values(created_at=datetime(2025, 6, 1, tzinfo=UTC))
    )
    await db_session.commit()
    db_session.expire_all()

    response = await async_client.get(
        "/api/v1/public/businesses?sort=newest&q=Newest+Sort+Studio&limit=50"
    )
    assert response.status_code == 200
    names = [item["name"] for item in response.json()["data"] if "Newest Sort Studio" in item["name"]]
    assert names.index("Newer Newest Sort Studio") < names.index("Older Newest Sort Studio")


@pytest.mark.asyncio
async def test_public_directory_sort_by_bookable_puts_booking_services_first(
    async_client: AsyncClient,
    db_session,
) -> None:
    booking_ctx = await _setup_active_business_with_service(async_client, db_session, "dir-sort-bookable-yes")
    order_ctx = await _setup_order_only_business(async_client, db_session, "dir-sort-bookable-no")
    await _set_business_name(db_session, booking_ctx["slug"], "Zulu Bookable Sort Studio")
    await _set_business_name(db_session, order_ctx["slug"], "Alpha Order Sort Studio")

    response = await async_client.get(
        "/api/v1/public/businesses?sort=bookable&q=Sort+Studio&limit=50"
    )
    assert response.status_code == 200
    names = [item["name"] for item in response.json()["data"] if item["name"].endswith("Sort Studio")]
    assert names.index("Zulu Bookable Sort Studio") < names.index("Alpha Order Sort Studio")


@pytest.mark.asyncio
async def test_public_directory_invalid_sort_falls_back_to_popular(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_active_business_with_service(async_client, db_session, "dir-sort-invalid")
    await _set_business_name(db_session, ctx["slug"], "Invalid Sort Fallback Studio")

    response = await async_client.get(
        "/api/v1/public/businesses?sort=not-a-real-sort&q=Invalid+Sort+Fallback+Studio"
    )
    assert response.status_code == 200
    slugs = {item["slug"] for item in response.json()["data"]}
    assert ctx["slug"] in slugs


@pytest.mark.asyncio
async def test_public_directory_sort_combines_with_location_and_pagination(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_active_business_with_service(async_client, db_session, "dir-sort-location")
    await _set_business_name(db_session, ctx["slug"], "Location Sort Studio")
    await db_session.execute(
        update(Business)
        .where(Business.slug == ctx["slug"])
        .values(
            settings={
                "public_location": {
                    "country": "UAE",
                    "city": "Dubai",
                    "district_or_area": "Marina",
                }
            }
        )
    )
    await db_session.commit()
    db_session.expire_all()

    response = await async_client.get(
        "/api/v1/public/businesses?sort=name&location=Marina&page=1&limit=12"
    )
    assert response.status_code == 200
    assert response.json()["meta"]["page"] == 1
    assert "contact_email" not in str(response.json())
