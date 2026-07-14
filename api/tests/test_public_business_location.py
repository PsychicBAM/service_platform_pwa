import pytest
from httpx import AsyncClient
from sqlalchemy import select, update

from app.models.business import Business
from app.utils.public_location import PublicLocation, set_public_location
from tests.conftest import BOOKING_SERVICE_PAYLOAD, activate_business, register_and_get_context
from tests.test_public_business_directory import _setup_active_business_with_service


async def _set_public_location(db_session, slug: str, **fields: str) -> None:
    result = await db_session.execute(select(Business).where(Business.slug == slug))
    business = result.scalar_one()
    location = PublicLocation.model_validate(fields)
    settings = set_public_location(business.settings, location)
    await db_session.execute(
        update(Business).where(Business.slug == slug).values(settings=settings)
    )
    await db_session.commit()
    db_session.expire_all()


@pytest.mark.asyncio
async def test_public_directory_returns_safe_location_fields(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_active_business_with_service(async_client, db_session, "loc-fields")
    await db_session.execute(
        update(Business)
        .where(Business.slug == ctx["slug"])
        .values(name="Location Fields Studio")
    )
    await _set_public_location(
        db_session,
        ctx["slug"],
        country="UAE",
        city="Dubai",
        district_or_area="Dubai Marina",
        public_address="Marina Walk",
        location_note="Near tram stop",
    )

    response = await async_client.get("/api/v1/public/businesses?q=Location+Fields+Studio")
    assert response.status_code == 200
    item = next(row for row in response.json()["data"] if row["slug"] == ctx["slug"])
    assert item["location"] == {
        "country": "UAE",
        "city": "Dubai",
        "district_or_area": "Dubai Marina",
        "public_address": "Marina Walk",
        "latitude": None,
        "longitude": None,
        "location_note": "Near tram stop",
    }
    assert item["address"] == "Dubai Marina, Dubai, UAE"
    assert "settings" not in item
    assert "contact_email" not in item


@pytest.mark.asyncio
async def test_public_directory_location_filter_by_city(
    async_client: AsyncClient,
    db_session,
) -> None:
    dubai = await _setup_active_business_with_service(async_client, db_session, "loc-city-dubai")
    paris = await _setup_active_business_with_service(async_client, db_session, "loc-city-paris")
    await db_session.execute(
        update(Business).where(Business.slug == dubai["slug"]).values(name="Dubai City Filter Biz")
    )
    await db_session.execute(
        update(Business).where(Business.slug == paris["slug"]).values(name="Paris City Filter Biz")
    )
    await _set_public_location(db_session, dubai["slug"], city="Dubai", country="UAE")
    await _set_public_location(db_session, paris["slug"], city="Paris", country="France")

    response = await async_client.get("/api/v1/public/businesses?location=Dubai")
    assert response.status_code == 200
    slugs = {item["slug"] for item in response.json()["data"]}
    assert dubai["slug"] in slugs
    assert paris["slug"] not in slugs


@pytest.mark.asyncio
async def test_public_directory_location_filter_by_district(
    async_client: AsyncClient,
    db_session,
) -> None:
    marina = await _setup_active_business_with_service(async_client, db_session, "loc-district-marina")
    jumeirah = await _setup_active_business_with_service(async_client, db_session, "loc-district-jumeirah")
    await db_session.execute(
        update(Business)
        .where(Business.slug == marina["slug"])
        .values(name="Marina District Filter Biz")
    )
    await db_session.execute(
        update(Business)
        .where(Business.slug == jumeirah["slug"])
        .values(name="Jumeirah District Filter Biz")
    )
    await _set_public_location(
        db_session,
        marina["slug"],
        city="Dubai",
        district_or_area="Dubai Marina",
        country="UAE",
    )
    await _set_public_location(
        db_session,
        jumeirah["slug"],
        city="Dubai",
        district_or_area="Jumeirah",
        country="UAE",
    )

    response = await async_client.get("/api/v1/public/businesses?location=Marina")
    assert response.status_code == 200
    slugs = {item["slug"] for item in response.json()["data"]}
    assert marina["slug"] in slugs
    assert jumeirah["slug"] not in slugs


@pytest.mark.asyncio
async def test_public_directory_location_filter_by_public_address(
    async_client: AsyncClient,
    db_session,
) -> None:
    bay = await _setup_active_business_with_service(async_client, db_session, "loc-address-bay")
    downtown = await _setup_active_business_with_service(async_client, db_session, "loc-address-downtown")
    await db_session.execute(
        update(Business).where(Business.slug == bay["slug"]).values(name="Bay Address Filter Biz")
    )
    await db_session.execute(
        update(Business)
        .where(Business.slug == downtown["slug"])
        .values(name="Downtown Address Filter Biz")
    )
    await _set_public_location(
        db_session,
        bay["slug"],
        city="Dubai",
        public_address="Bay Square, Business Bay",
        country="UAE",
    )
    await _set_public_location(
        db_session,
        downtown["slug"],
        city="Dubai",
        public_address="Boulevard Plaza, Downtown Dubai",
        country="UAE",
    )

    response = await async_client.get("/api/v1/public/businesses?location=Business+Bay")
    assert response.status_code == 200
    slugs = {item["slug"] for item in response.json()["data"]}
    assert bay["slug"] in slugs
    assert downtown["slug"] not in slugs


@pytest.mark.asyncio
async def test_public_directory_location_filter_works_with_q_and_sort(
    async_client: AsyncClient,
    db_session,
) -> None:
    first = await _setup_active_business_with_service(async_client, db_session, "loc-combo-a")
    second = await _setup_active_business_with_service(async_client, db_session, "loc-combo-b")
    await db_session.execute(
        update(Business).where(Business.slug == first["slug"]).values(name="Alpha Combo Location Biz")
    )
    await db_session.execute(
        update(Business).where(Business.slug == second["slug"]).values(name="Zulu Combo Location Biz")
    )
    await _set_public_location(db_session, first["slug"], city="Dubai", country="UAE")
    await _set_public_location(db_session, second["slug"], city="Dubai", country="UAE")

    response = await async_client.get(
        "/api/v1/public/businesses?location=Dubai&q=Combo+Location&sort=name&limit=50"
    )
    assert response.status_code == 200
    names = [item["name"] for item in response.json()["data"] if "Combo Location Biz" in item["name"]]
    assert names.index("Alpha Combo Location Biz") < names.index("Zulu Combo Location Biz")


@pytest.mark.asyncio
async def test_admin_can_update_public_location(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "loc-admin-update")
    await activate_business(db_session, ctx["slug"])
    service_resp = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json=BOOKING_SERVICE_PAYLOAD,
        headers=ctx["headers"],
    )
    assert service_resp.status_code == 201

    response = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
        json={
            "public_location": {
                "country": "UAE",
                "city": "Dubai",
                "district_or_area": "Business Bay",
                "public_address": "Bay Square",
                "latitude": 25.185,
                "longitude": 55.265,
            }
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["public_location"]["city"] == "Dubai"
    assert body["public_location"]["latitude"] == 25.185
    assert body["address"] == "Business Bay, Dubai, UAE"


@pytest.mark.asyncio
async def test_admin_public_location_rejects_invalid_latitude(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "loc-invalid-lat")
    response = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
        json={"public_location": {"latitude": 95}},
    )
    assert response.status_code == 422
