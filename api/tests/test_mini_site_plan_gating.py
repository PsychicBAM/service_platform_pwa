"""Plan gating for mini-site config saves."""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import SubscriptionPlan, SubscriptionStatus
from app.repositories.business_repository import BusinessRepository
from tests.conftest import activate_business, register_and_get_context


def _path(business_id: str) -> str:
    return f"/api/v1/businesses/{business_id}/mini-site-config"


async def _set_plan(
    db_session: AsyncSession,
    business_id: str,
    plan: SubscriptionPlan,
) -> None:
    repo = BusinessRepository(db_session)
    subscription = await repo.get_subscription(uuid.UUID(business_id))
    assert subscription is not None
    await repo.update_subscription(
        subscription,
        {"plan": plan, "status": SubscriptionStatus.active},
    )
    await db_session.commit()
    db_session.expire_all()


def _clean_payload() -> dict:
    return {
        "version": 1,
        "theme": {"template": "clean"},
        "sections": [
            {"id": "hero", "type": "hero", "enabled": True, "order": 0},
            {"id": "about", "type": "about", "enabled": False, "order": 1},
            {"id": "services", "type": "services", "enabled": False, "order": 2},
            {"id": "contact", "type": "contact", "enabled": False, "order": 3},
            {"id": "booking_cta", "type": "booking_cta", "enabled": False, "order": 4},
        ],
        "social_links": {},
    }


def _service_payload() -> dict:
    payload = _clean_payload()
    payload["theme"] = {"template": "service"}
    return payload


@pytest.mark.asyncio
@pytest.mark.parametrize("plan", [SubscriptionPlan.free, SubscriptionPlan.starter])
async def test_free_and_starter_cannot_save_mini_site_config(
    async_client: AsyncClient,
    db_session: AsyncSession,
    plan: SubscriptionPlan,
) -> None:
    ctx = await register_and_get_context(async_client, f"mini-gate-{plan.value}")
    await activate_business(db_session, ctx["slug"])
    await _set_plan(db_session, ctx["business_id"], plan)

    response = await async_client.put(
        _path(ctx["business_id"]),
        headers=ctx["headers"],
        json=_clean_payload(),
    )
    assert response.status_code == 400
    message = response.json()["error"]["message"]
    assert "Business" in message or "Pro" in message


@pytest.mark.asyncio
async def test_business_can_save_clean_template(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    ctx = await register_and_get_context(async_client, "mini-gate-business-clean")
    await activate_business(db_session, ctx["slug"])
    await _set_plan(db_session, ctx["business_id"], SubscriptionPlan.business)

    response = await async_client.put(
        _path(ctx["business_id"]),
        headers=ctx["headers"],
        json=_clean_payload(),
    )
    assert response.status_code == 200
    assert response.json()["theme"]["template"] == "clean"


@pytest.mark.asyncio
async def test_business_cannot_save_non_clean_template(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    ctx = await register_and_get_context(async_client, "mini-gate-business-service")
    await activate_business(db_session, ctx["slug"])
    await _set_plan(db_session, ctx["business_id"], SubscriptionPlan.business)

    response = await async_client.put(
        _path(ctx["business_id"]),
        headers=ctx["headers"],
        json=_service_payload(),
    )
    assert response.status_code == 400
    assert "Clean" in response.json()["error"]["message"]


@pytest.mark.asyncio
@pytest.mark.parametrize("plan", [SubscriptionPlan.free, SubscriptionPlan.starter])
async def test_free_and_starter_can_select_default_public_page(
    async_client: AsyncClient,
    db_session: AsyncSession,
    plan: SubscriptionPlan,
) -> None:
    ctx = await register_and_get_context(async_client, f"mini-gate-default-{plan.value}")
    await activate_business(db_session, ctx["slug"])
    await _set_plan(db_session, ctx["business_id"], plan)

    response = await async_client.put(
        f"/api/v1/businesses/{ctx['business_id']}/public-page-variant",
        headers=ctx["headers"],
        json={"public_page_variant": "standard"},
    )
    assert response.status_code == 200
    assert response.json()["public_page_variant"] == "standard"


@pytest.mark.asyncio
@pytest.mark.parametrize("plan", [SubscriptionPlan.free, SubscriptionPlan.starter])
async def test_free_and_starter_cannot_select_mini_site_variant(
    async_client: AsyncClient,
    db_session: AsyncSession,
    plan: SubscriptionPlan,
) -> None:
    ctx = await register_and_get_context(async_client, f"mini-gate-variant-{plan.value}")
    await activate_business(db_session, ctx["slug"])
    await _set_plan(db_session, ctx["business_id"], plan)

    response = await async_client.put(
        f"/api/v1/businesses/{ctx['business_id']}/public-page-variant",
        headers=ctx["headers"],
        json={"public_page_variant": "mini_site"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_business_can_switch_to_default_without_deleting_config(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    ctx = await register_and_get_context(async_client, "mini-gate-business-default")
    await activate_business(db_session, ctx["slug"])
    await _set_plan(db_session, ctx["business_id"], SubscriptionPlan.business)

    save = await async_client.put(
        _path(ctx["business_id"]),
        headers=ctx["headers"],
        json=_clean_payload(),
    )
    assert save.status_code == 200

    switch = await async_client.put(
        f"/api/v1/businesses/{ctx['business_id']}/public-page-variant",
        headers=ctx["headers"],
        json={"public_page_variant": "standard"},
    )
    assert switch.status_code == 200
    assert switch.json()["public_page_variant"] == "standard"

    config = await async_client.get(
        _path(ctx["business_id"]),
        headers=ctx["headers"],
    )
    assert config.status_code == 200
    assert config.json()["theme"]["template"] == "clean"

    public = await async_client.get(f"/api/v1/public/b/{ctx['slug']}")
    assert public.status_code == 200
    assert public.json()["public_page_variant"] == "standard"
    assert public.json()["mini_site_config"] is None


@pytest.mark.asyncio
async def test_business_can_select_mini_site_variant(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    ctx = await register_and_get_context(async_client, "mini-gate-business-variant")
    await activate_business(db_session, ctx["slug"])
    await _set_plan(db_session, ctx["business_id"], SubscriptionPlan.business)

    response = await async_client.put(
        f"/api/v1/businesses/{ctx['business_id']}/public-page-variant",
        headers=ctx["headers"],
        json={"public_page_variant": "mini_site"},
    )
    assert response.status_code == 200
    assert response.json()["public_page_variant"] == "mini_site"


@pytest.mark.asyncio
async def test_pro_can_save_all_templates(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    ctx = await register_and_get_context(async_client, "mini-gate-pro-service")
    await activate_business(db_session, ctx["slug"])
    await _set_plan(db_session, ctx["business_id"], SubscriptionPlan.pro)

    response = await async_client.put(
        _path(ctx["business_id"]),
        headers=ctx["headers"],
        json=_service_payload(),
    )
    assert response.status_code == 200
    assert response.json()["theme"]["template"] == "service"
