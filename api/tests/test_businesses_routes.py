import pytest
from httpx import AsyncClient
from sqlalchemy import select, update

from app.main import app
from app.models.business import Business
from tests.conftest import activate_business, register_and_get_context


@pytest.mark.asyncio
async def test_admin_can_get_own_business_profile(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "biz-profile-get")
    await activate_business(db_session, ctx["slug"])
    response = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["slug"] == ctx["slug"]
    assert body["name"] == "Joe's Salon"
    assert "settings" in body
    assert body["settings"]["cancellation_hours"] == 24
    assert body["subscription"] is not None
    assert body["subscription"]["plan"] == "free"


@pytest.mark.asyncio
async def test_non_member_cannot_get_business_profile(
    async_client: AsyncClient,
    db_session,
) -> None:
    owner = await register_and_get_context(async_client, "biz-profile-owner")
    outsider = await register_and_get_context(async_client, "biz-profile-outsider")
    response = await async_client.get(
        f"/api/v1/businesses/{owner['business_id']}",
        headers=outsider["headers"],
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_from_business_a_cannot_get_business_b_profile(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx_a = await register_and_get_context(async_client, "biz-profile-a")
    ctx_b = await register_and_get_context(async_client, "biz-profile-b")
    response = await async_client.get(
        f"/api/v1/businesses/{ctx_b['business_id']}",
        headers=ctx_a["headers"],
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_update_name_description_contact_fields(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "biz-profile-update")
    response = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
        json={
            "name": "Updated Salon",
            "description": "Best cuts in town",
            "contact_email": "hello@salon.com",
            "contact_phone": "+15551234",
            "address": "123 Main St",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Updated Salon"
    assert body["description"] == "Best cuts in town"
    assert body["contact_email"] == "hello@salon.com"
    assert body["contact_phone"] == "+15551234"
    assert body["address"] == "123 Main St"


@pytest.mark.asyncio
async def test_admin_cannot_update_slug(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "biz-profile-slug")
    original_slug = ctx["slug"]
    response = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
        json={"name": "Renamed", "slug": "hacked-slug"},
    )
    assert response.status_code == 200
    assert response.json()["slug"] == original_slug


@pytest.mark.asyncio
async def test_admin_cannot_update_status(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "biz-profile-status")
    await activate_business(db_session, ctx["slug"])
    response = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
        json={"name": "Still Active", "status": "suspended"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "active"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "mode",
    ["booking_only", "orders_only", "both"],
)
async def test_admin_can_update_operating_mode(
    async_client: AsyncClient,
    db_session,
    mode: str,
) -> None:
    ctx = await register_and_get_context(async_client, f"biz-mode-{mode.replace('_', '-')}")
    response = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
        json={"operating_mode": mode},
    )
    assert response.status_code == 200
    assert response.json()["operating_mode"] == mode


@pytest.mark.asyncio
async def test_invalid_operating_mode_rejected(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "biz-invalid-mode")
    response = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
        json={"operating_mode": "invalid_mode"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_settings_patch_merges_with_existing_settings(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "biz-settings-merge")
    await db_session.execute(
        update(Business)
        .where(Business.slug == ctx["slug"])
        .values(settings={"custom_future_key": True, "cancellation_hours": 24})
    )
    await db_session.commit()
    response = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
        json={"settings": {"cancellation_hours": 48}},
    )
    assert response.status_code == 200
    assert response.json()["settings"]["cancellation_hours"] == 48

    db_session.expire_all()
    result = await db_session.execute(
        select(Business.settings).where(Business.slug == ctx["slug"])
    )
    stored = result.scalar_one()
    assert stored["custom_future_key"] is True
    assert stored["cancellation_hours"] == 48


@pytest.mark.asyncio
async def test_invalid_cancellation_hours_rejected(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "biz-invalid-cancel")
    response = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
        json={"settings": {"cancellation_hours": 9999}},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_invalid_slot_interval_minutes_rejected(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "biz-invalid-slot")
    response = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
        json={"settings": {"slot_interval_minutes": 7}},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_invalid_timezone_rejected(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "biz-invalid-tz")
    response = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}",
        headers=ctx["headers"],
        json={"timezone": "Not/A_Real_Zone"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_TIMEZONE"


@pytest.mark.asyncio
async def test_public_business_returns_safe_fields_only(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "biz-public-safe")
    await activate_business(db_session, ctx["slug"])
    response = await async_client.get(f"/api/v1/public/b/{ctx['slug']}")
    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {
        "id",
        "name",
        "slug",
        "description",
        "logo_url",
        "operating_mode",
        "contact_phone",
        "address",
        "location",
        "average_rating",
        "review_count",
        "cover_image_url",
        "public_page_variant",
        "mini_site_config",
    }
    assert body["mini_site_config"] is None
    assert body["name"] == "Joe's Salon"
    assert body["review_count"] == 0
    assert body["average_rating"] is None


@pytest.mark.asyncio
async def test_public_business_does_not_expose_internal_fields(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "biz-public-internal")
    await activate_business(db_session, ctx["slug"])
    await db_session.execute(
        update(Business)
        .where(Business.slug == ctx["slug"])
        .values(
            contact_email="secret@salon.com",
            stripe_account_id="acct_secret",
        )
    )
    await db_session.commit()
    response = await async_client.get(f"/api/v1/public/b/{ctx['slug']}")
    assert response.status_code == 200
    body = response.json()
    assert "settings" not in body
    assert "subscription" not in body
    assert "stripe_account_id" not in body
    assert "contact_email" not in body
    assert "status" not in body
    assert "timezone" not in body


def test_openapi_includes_business_endpoints() -> None:
    paths = app.openapi()["paths"]
    assert "/api/v1/businesses/{business_id}" in paths
    assert "get" in paths["/api/v1/businesses/{business_id}"]
    assert "patch" in paths["/api/v1/businesses/{business_id}"]
    assert "/api/v1/public/b/{slug}" in paths
    assert "get" in paths["/api/v1/public/b/{slug}"]
