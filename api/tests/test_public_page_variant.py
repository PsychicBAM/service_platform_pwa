import uuid
from types import SimpleNamespace

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import SubscriptionPlan, SubscriptionStatus
from app.repositories.business_repository import BusinessRepository, DEFAULT_BUSINESS_SETTINGS
from app.utils.mini_site_config import MINI_SITE_SETTINGS_KEY, default_mini_site_config
from app.utils.public_page_variant import resolve_public_page_variant
from tests.conftest import activate_business, register_and_get_context


async def _set_subscription_plan(
    db_session: AsyncSession,
    business_id: str,
    *,
    plan: SubscriptionPlan,
    status: SubscriptionStatus = SubscriptionStatus.active,
) -> None:
    repo = BusinessRepository(db_session)
    subscription = await repo.get_subscription(uuid.UUID(business_id))
    assert subscription is not None
    await repo.update_subscription(
        subscription,
        {"plan": plan, "status": status},
    )
    await db_session.commit()
    db_session.expire_all()


def test_resolve_public_page_variant_active_pro() -> None:
    subscription = SimpleNamespace(
        plan=SubscriptionPlan.pro,
        status=SubscriptionStatus.active,
    )
    assert resolve_public_page_variant(subscription).value == "mini_site"


@pytest.mark.parametrize(
    ("plan", "status"),
    [
        (SubscriptionPlan.free, SubscriptionStatus.active),
        (SubscriptionPlan.starter, SubscriptionStatus.active),
        (SubscriptionPlan.business, SubscriptionStatus.active),
        (SubscriptionPlan.pro, SubscriptionStatus.trialing),
        (SubscriptionPlan.pro, SubscriptionStatus.cancelled),
        (SubscriptionPlan.pro, SubscriptionStatus.past_due),
    ],
)
def test_resolve_public_page_variant_standard_cases(
    plan: SubscriptionPlan,
    status: SubscriptionStatus,
) -> None:
    subscription = SimpleNamespace(plan=plan, status=status)
    assert resolve_public_page_variant(subscription).value == "standard"


def test_resolve_public_page_variant_without_subscription() -> None:
    assert resolve_public_page_variant(None).value == "standard"


@pytest.mark.asyncio
async def test_public_business_includes_public_page_variant(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    ctx = await register_and_get_context(async_client, "public-variant-field")
    await activate_business(db_session, ctx["slug"])
    response = await async_client.get(f"/api/v1/public/b/{ctx['slug']}")
    assert response.status_code == 200
    body = response.json()
    assert body["public_page_variant"] == "standard"
    assert body["mini_site_config"] is None


@pytest.mark.asyncio
async def test_public_business_mini_site_for_active_pro(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    ctx = await register_and_get_context(async_client, "public-variant-pro")
    await activate_business(db_session, ctx["slug"])
    await _set_subscription_plan(
        db_session,
        ctx["business_id"],
        plan=SubscriptionPlan.pro,
    )

    response = await async_client.get(f"/api/v1/public/b/{ctx['slug']}")
    assert response.status_code == 200
    body = response.json()
    assert body["public_page_variant"] == "mini_site"
    assert body["mini_site_config"] is not None
    assert body["mini_site_config"]["version"] == 1
    assert len(body["mini_site_config"]["sections"]) > 0


@pytest.mark.asyncio
async def test_public_business_standard_for_business_plan(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    ctx = await register_and_get_context(async_client, "public-variant-biz")
    await activate_business(db_session, ctx["slug"])
    await _set_subscription_plan(
        db_session,
        ctx["business_id"],
        plan=SubscriptionPlan.business,
    )

    response = await async_client.get(f"/api/v1/public/b/{ctx['slug']}")
    assert response.status_code == 200
    body = response.json()
    assert body["public_page_variant"] == "standard"
    assert body["mini_site_config"] is None


@pytest.mark.asyncio
async def test_public_business_does_not_expose_subscription_internals(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    ctx = await register_and_get_context(async_client, "public-variant-safe")
    await activate_business(db_session, ctx["slug"])
    repo = BusinessRepository(db_session)
    subscription = await repo.get_subscription(uuid.UUID(ctx["business_id"]))
    assert subscription is not None
    await repo.update_subscription(
        subscription,
        {
            "plan": SubscriptionPlan.pro,
            "status": SubscriptionStatus.active,
            "stripe_subscription_id": "sub_secret_123",
            "stripe_customer_id": "cus_secret_456",
        },
    )
    await db_session.commit()

    response = await async_client.get(f"/api/v1/public/b/{ctx['slug']}")
    assert response.status_code == 200
    body = response.json()
    assert body["public_page_variant"] == "mini_site"
    assert "subscription" not in body
    assert "stripe_subscription_id" not in body
    assert "stripe_customer_id" not in body
    assert "plan" not in body
    assert "settings" not in body
    assert body["mini_site_config"] is not None


@pytest.mark.asyncio
async def test_public_business_pro_without_saved_config_gets_default_mini_site_config(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    ctx = await register_and_get_context(async_client, "public-mini-site-default")
    await activate_business(db_session, ctx["slug"])
    await _set_subscription_plan(
        db_session,
        ctx["business_id"],
        plan=SubscriptionPlan.pro,
    )

    repo = BusinessRepository(db_session)
    business = await repo.get_by_slug(ctx["slug"])
    assert business is not None
    assert (business.settings or {}).get(MINI_SITE_SETTINGS_KEY) is None

    response = await async_client.get(f"/api/v1/public/b/{ctx['slug']}")
    assert response.status_code == 200
    body = response.json()
    default_config = default_mini_site_config()
    assert body["mini_site_config"]["version"] == default_config.version
    assert [section.type for section in default_config.sections] == [
        section["type"] for section in body["mini_site_config"]["sections"]
    ]


@pytest.mark.asyncio
async def test_public_business_pro_with_saved_config_returns_normalized_config(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    ctx = await register_and_get_context(async_client, "public-mini-site-saved")
    await activate_business(db_session, ctx["slug"])
    await _set_subscription_plan(
        db_session,
        ctx["business_id"],
        plan=SubscriptionPlan.pro,
    )

    repo = BusinessRepository(db_session)
    business = await repo.get_by_slug(ctx["slug"])
    assert business is not None
    settings = dict(business.settings or DEFAULT_BUSINESS_SETTINGS)
    settings[MINI_SITE_SETTINGS_KEY] = {
        "version": 1,
        "theme": {"template": "service", "background_style": "soft", "background_color": "#f1f5f9"},
        "sections": [
            {
                "id": "hero",
                "type": "hero",
                "enabled": True,
                "order": 0,
                "title": "Public hero",
            },
            {"id": "about", "type": "about", "enabled": False, "order": 1},
            {"id": "services", "type": "services", "enabled": False, "order": 2},
            {"id": "contact", "type": "contact", "enabled": False, "order": 3},
            {"id": "booking_cta", "type": "booking_cta", "enabled": False, "order": 4},
        ],
        "social_links": {},
    }
    await repo.update_business(business, {"settings": settings})
    await db_session.commit()
    db_session.expire_all()

    response = await async_client.get(f"/api/v1/public/b/{ctx['slug']}")
    assert response.status_code == 200
    body = response.json()
    hero = next(
        section for section in body["mini_site_config"]["sections"] if section["type"] == "hero"
    )
    assert hero["title"] == "Public hero"
    assert body["mini_site_config"]["theme"]["template"] == "service"
    assert body["mini_site_config"]["theme"]["background_style"] == "soft"
    assert body["mini_site_config"]["theme"]["background_color"] == "#f1f5f9"


@pytest.mark.asyncio
async def test_public_business_mini_site_config_is_sanitized(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    ctx = await register_and_get_context(async_client, "public-mini-site-sanitize")
    await activate_business(db_session, ctx["slug"])
    await _set_subscription_plan(
        db_session,
        ctx["business_id"],
        plan=SubscriptionPlan.pro,
    )

    repo = BusinessRepository(db_session)
    business = await repo.get_by_slug(ctx["slug"])
    assert business is not None
    settings = dict(business.settings or DEFAULT_BUSINESS_SETTINGS)
    settings[MINI_SITE_SETTINGS_KEY] = {
        "version": 1,
        "theme": {"template": "clean"},
        "sections": [
            {
                "id": "hero",
                "type": "hero",
                "enabled": True,
                "order": 0,
                "title": "<script>alert(1)</script>Safe title",
                "body": "<b>Hello</b> world",
            },
            {"id": "about", "type": "about", "enabled": False, "order": 1},
            {"id": "services", "type": "services", "enabled": False, "order": 2},
            {"id": "contact", "type": "contact", "enabled": False, "order": 3},
            {"id": "booking_cta", "type": "booking_cta", "enabled": False, "order": 4},
        ],
        "social_links": {},
    }
    await repo.update_business(business, {"settings": settings})
    await db_session.commit()
    db_session.expire_all()

    response = await async_client.get(f"/api/v1/public/b/{ctx['slug']}")
    assert response.status_code == 200
    hero = next(
        section
        for section in response.json()["mini_site_config"]["sections"]
        if section["type"] == "hero"
    )
    assert hero["title"] == "scriptalert(1)/scriptSafe title"
    assert hero["body"] == "bHello/b world"
    assert "<" not in hero["title"]
    assert ">" not in hero["title"]


@pytest.mark.asyncio
async def test_public_business_standard_does_not_expose_unrelated_settings_keys(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    ctx = await register_and_get_context(async_client, "public-mini-site-no-settings")
    await activate_business(db_session, ctx["slug"])

    repo = BusinessRepository(db_session)
    business = await repo.get_by_slug(ctx["slug"])
    assert business is not None
    settings = dict(business.settings or DEFAULT_BUSINESS_SETTINGS)
    settings["custom_internal_flag"] = True
    settings[MINI_SITE_SETTINGS_KEY] = default_mini_site_config().model_dump()
    await repo.update_business(business, {"settings": settings})
    await db_session.commit()
    db_session.expire_all()

    response = await async_client.get(f"/api/v1/public/b/{ctx['slug']}")
    assert response.status_code == 200
    body = response.json()
    assert body["public_page_variant"] == "standard"
    assert body["mini_site_config"] is None
    assert "settings" not in body
    assert "custom_internal_flag" not in body
