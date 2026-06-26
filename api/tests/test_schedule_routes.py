import pytest
from httpx import AsyncClient

from app.main import app
from tests.conftest import register_and_get_context, weekday_working_hours_payload


@pytest.mark.asyncio
async def test_admin_can_replace_working_hours(async_client: AsyncClient) -> None:
    ctx = await register_and_get_context(async_client, "sched-hours")
    response = await async_client.put(
        f"/api/v1/businesses/{ctx['business_id']}/schedule/working-hours",
        json=weekday_working_hours_payload(),
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 7
    assert any(row["day_of_week"] == 1 and row["is_open"] for row in body)


@pytest.mark.asyncio
async def test_working_hours_rejects_invalid_day_of_week(
    async_client: AsyncClient,
) -> None:
    ctx = await register_and_get_context(async_client, "sched-bad-day")
    payload = weekday_working_hours_payload()
    payload["working_hours"][0]["day_of_week"] = 7
    response = await async_client.put(
        f"/api/v1/businesses/{ctx['business_id']}/schedule/working-hours",
        json=payload,
        headers=ctx["headers"],
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_working_hours_rejects_opens_at_gte_closes_at(
    async_client: AsyncClient,
) -> None:
    ctx = await register_and_get_context(async_client, "sched-bad-time")
    payload = weekday_working_hours_payload()
    payload["working_hours"][1]["opens_at"] = "17:00"
    payload["working_hours"][1]["closes_at"] = "09:00"
    response = await async_client.put(
        f"/api/v1/businesses/{ctx['business_id']}/schedule/working-hours",
        json=payload,
        headers=ctx["headers"],
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_admin_can_create_update_delete_break(async_client: AsyncClient) -> None:
    ctx = await register_and_get_context(async_client, "sched-break")
    create_resp = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/schedule/breaks",
        json={
            "label": "Lunch",
            "day_of_week": 1,
            "starts_at": "12:00",
            "ends_at": "13:00",
        },
        headers=ctx["headers"],
    )
    assert create_resp.status_code == 201
    break_id = create_resp.json()["id"]

    update_resp = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/schedule/breaks/{break_id}",
        json={"label": "Lunch break"},
        headers=ctx["headers"],
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["label"] == "Lunch break"

    delete_resp = await async_client.delete(
        f"/api/v1/businesses/{ctx['business_id']}/schedule/breaks/{break_id}",
        headers=ctx["headers"],
    )
    assert delete_resp.status_code == 204


@pytest.mark.asyncio
async def test_admin_can_create_update_delete_unavailable_time(
    async_client: AsyncClient,
) -> None:
    ctx = await register_and_get_context(async_client, "sched-block")
    create_resp = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/schedule/unavailable-times",
        json={
            "starts_at": "2026-06-25T10:00:00-04:00",
            "ends_at": "2026-06-25T11:00:00-04:00",
            "reason": "Staff meeting",
        },
        headers=ctx["headers"],
    )
    assert create_resp.status_code == 201
    block_id = create_resp.json()["id"]

    update_resp = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/schedule/unavailable-times/{block_id}",
        json={"reason": "Updated reason"},
        headers=ctx["headers"],
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["reason"] == "Updated reason"

    delete_resp = await async_client.delete(
        f"/api/v1/businesses/{ctx['business_id']}/schedule/unavailable-times/{block_id}",
        headers=ctx["headers"],
    )
    assert delete_resp.status_code == 204


@pytest.mark.asyncio
async def test_non_member_cannot_manage_schedule(async_client: AsyncClient) -> None:
    owner_ctx = await register_and_get_context(async_client, "sched-owner")
    outsider_ctx = await register_and_get_context(async_client, "sched-outsider")
    response = await async_client.put(
        f"/api/v1/businesses/{owner_ctx['business_id']}/schedule/working-hours",
        json=weekday_working_hours_payload(),
        headers=outsider_ctx["headers"],
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_business_a_admin_cannot_manage_business_b_schedule(
    async_client: AsyncClient,
) -> None:
    ctx_a = await register_and_get_context(async_client, "sched-iso-a")
    ctx_b = await register_and_get_context(async_client, "sched-iso-b")
    response = await async_client.get(
        f"/api/v1/businesses/{ctx_b['business_id']}/schedule",
        headers=ctx_a["headers"],
    )
    assert response.status_code == 403


def test_openapi_includes_schedule_endpoints() -> None:
    paths = app.openapi()["paths"]
    assert "/api/v1/businesses/{business_id}/schedule" in paths
    assert "/api/v1/businesses/{business_id}/schedule/working-hours" in paths
    assert "/api/v1/public/b/{slug}/availability" in paths
