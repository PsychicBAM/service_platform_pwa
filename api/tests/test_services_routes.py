import pytest
from httpx import AsyncClient

from app.main import app
from tests.conftest import (
    BOOKING_SERVICE_PAYLOAD,
    ORDER_SERVICE_PAYLOAD,
    register_and_get_context,
    register_payload,
)


@pytest.mark.asyncio
async def test_admin_can_create_booking_service_with_duration(
    async_client: AsyncClient,
) -> None:
    ctx = await register_and_get_context(async_client, "svc-booking-ok")
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json=BOOKING_SERVICE_PAYLOAD,
        headers=ctx["headers"],
    )
    assert response.status_code == 201
    body = response.json()
    assert body["type"] == "booking"
    assert body["duration_minutes"] == 30
    assert body["business_id"] == ctx["business_id"]


@pytest.mark.asyncio
async def test_admin_cannot_create_booking_service_without_duration(
    async_client: AsyncClient,
) -> None:
    ctx = await register_and_get_context(async_client, "svc-booking-bad")
    payload = {**BOOKING_SERVICE_PAYLOAD}
    del payload["duration_minutes"]
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json=payload,
        headers=ctx["headers"],
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_admin_can_create_order_service_without_duration(
    async_client: AsyncClient,
) -> None:
    ctx = await register_and_get_context(async_client, "svc-order-ok")
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json=ORDER_SERVICE_PAYLOAD,
        headers=ctx["headers"],
    )
    assert response.status_code == 201
    body = response.json()
    assert body["type"] == "order"
    assert body["duration_minutes"] is None


@pytest.mark.asyncio
async def test_order_service_response_has_no_meaningful_duration(
    async_client: AsyncClient,
) -> None:
    ctx = await register_and_get_context(async_client, "svc-order-dur")
    payload = {**ORDER_SERVICE_PAYLOAD, "duration_minutes": 60}
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json=payload,
        headers=ctx["headers"],
    )
    assert response.status_code == 201
    assert response.json()["duration_minutes"] is None


@pytest.mark.asyncio
async def test_service_type_cannot_be_changed_via_patch(
    async_client: AsyncClient,
) -> None:
    ctx = await register_and_get_context(async_client, "svc-type-immutable")
    create_resp = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json=BOOKING_SERVICE_PAYLOAD,
        headers=ctx["headers"],
    )
    service_id = create_resp.json()["id"]
    patch_resp = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/services/{service_id}",
        json={"type": "order"},
        headers=ctx["headers"],
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["type"] == "booking"


@pytest.mark.asyncio
async def test_admin_can_update_name_description_price_is_active(
    async_client: AsyncClient,
) -> None:
    ctx = await register_and_get_context(async_client, "svc-update")
    create_resp = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json=BOOKING_SERVICE_PAYLOAD,
        headers=ctx["headers"],
    )
    service_id = create_resp.json()["id"]
    patch_resp = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/services/{service_id}",
        json={
            "name": "Premium Cut",
            "description": "Updated description",
            "price_cents": 3500,
            "is_active": False,
        },
        headers=ctx["headers"],
    )
    assert patch_resp.status_code == 200
    body = patch_resp.json()
    assert body["name"] == "Premium Cut"
    assert body["description"] == "Updated description"
    assert body["price_cents"] == 3500
    assert body["is_active"] is False


@pytest.mark.asyncio
async def test_admin_can_soft_delete_service(
    async_client: AsyncClient,
) -> None:
    ctx = await register_and_get_context(async_client, "svc-delete")
    create_resp = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json=BOOKING_SERVICE_PAYLOAD,
        headers=ctx["headers"],
    )
    service_id = create_resp.json()["id"]
    delete_resp = await async_client.delete(
        f"/api/v1/businesses/{ctx['business_id']}/services/{service_id}",
        headers=ctx["headers"],
    )
    assert delete_resp.status_code == 200
    assert delete_resp.json()["is_active"] is False


@pytest.mark.asyncio
async def test_non_member_cannot_create_service(async_client: AsyncClient) -> None:
    owner_ctx = await register_and_get_context(async_client, "svc-owner-a")
    outsider_ctx = await register_and_get_context(async_client, "svc-outsider")
    response = await async_client.post(
        f"/api/v1/businesses/{owner_ctx['business_id']}/services",
        json=BOOKING_SERVICE_PAYLOAD,
        headers=outsider_ctx["headers"],
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_admin_from_business_a_cannot_read_business_b_service(
    async_client: AsyncClient,
) -> None:
    ctx_a = await register_and_get_context(async_client, "svc-iso-a")
    ctx_b = await register_and_get_context(async_client, "svc-iso-b")
    create_resp = await async_client.post(
        f"/api/v1/businesses/{ctx_b['business_id']}/services",
        json=BOOKING_SERVICE_PAYLOAD,
        headers=ctx_b["headers"],
    )
    service_id = create_resp.json()["id"]
    response = await async_client.get(
        f"/api/v1/businesses/{ctx_b['business_id']}/services/{service_id}",
        headers=ctx_a["headers"],
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_from_business_a_cannot_update_business_b_service(
    async_client: AsyncClient,
) -> None:
    ctx_a = await register_and_get_context(async_client, "svc-upd-a")
    ctx_b = await register_and_get_context(async_client, "svc-upd-b")
    create_resp = await async_client.post(
        f"/api/v1/businesses/{ctx_b['business_id']}/services",
        json=BOOKING_SERVICE_PAYLOAD,
        headers=ctx_b["headers"],
    )
    service_id = create_resp.json()["id"]
    response = await async_client.patch(
        f"/api/v1/businesses/{ctx_b['business_id']}/services/{service_id}",
        json={"name": "Hacked"},
        headers=ctx_a["headers"],
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_free_plan_max_three_services_enforced(
    async_client: AsyncClient,
) -> None:
    ctx = await register_and_get_context(async_client, "svc-limit")
    for index in range(3):
        response = await async_client.post(
            f"/api/v1/businesses/{ctx['business_id']}/services",
            json={**BOOKING_SERVICE_PAYLOAD, "name": f"Service {index + 1}"},
            headers=ctx["headers"],
        )
        assert response.status_code == 201

    fourth = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json={**ORDER_SERVICE_PAYLOAD, "name": "Fourth Service"},
        headers=ctx["headers"],
    )
    assert fourth.status_code == 403
    assert fourth.json()["error"]["code"] == "PLAN_LIMIT_EXCEEDED"


@pytest.mark.asyncio
async def test_openapi_includes_services_endpoints() -> None:
    paths = app.openapi()["paths"]
    assert "/api/v1/businesses/{business_id}/services" in paths
    assert "/api/v1/businesses/{business_id}/services/{service_id}" in paths
    assert "/api/v1/public/b/{slug}/services" in paths
    assert "/api/v1/public/b/{slug}/services/{service_id}" in paths
