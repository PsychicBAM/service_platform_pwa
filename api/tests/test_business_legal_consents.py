import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select

from app.models.enums import ConsentEntityType, ConsentSource, UserRole
from app.models.legal_consent_record import LegalConsentRecord
from app.models.user import User
from app.services.password_service import hash_password
from tests.conftest import register_and_get_context, register_payload
from tests.test_bookings_availability_blocking import FIXED_NOW, _setup_booking_business
from tests.test_public_booking_create import booking_payload
from tests.test_public_order_create import _setup_order_business, order_payload
from tests.test_superadmin_routes import _promote_superadmin

SUPERADMIN_LEGAL_CONSENTS_PATH = "/api/v1/superadmin/legal-consents"

ALLOWED_ITEM_KEYS = {
    "id",
    "business_id",
    "user_id",
    "client_id",
    "source",
    "entity_type",
    "entity_id",
    "legal_consent_version",
    "accepted_at",
    "created_at",
    "business_name",
}


def _business_legal_consents_path(business_id: str) -> str:
    return f"/api/v1/businesses/{business_id}/legal-consents"


async def _consent_count(db_session) -> int:
    return (await db_session.execute(select(func.count()).select_from(LegalConsentRecord))).scalar_one()


async def _register_with_consent(async_client: AsyncClient, suffix: str) -> dict:
    response = await async_client.post("/api/v1/auth/register", json=register_payload(suffix))
    assert response.status_code == 201
    return response.json()


@pytest.mark.asyncio
async def test_anonymous_request_rejected(async_client: AsyncClient) -> None:
    response = await async_client.get(_business_legal_consents_path(str(uuid.uuid4())))
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_client_user_rejected(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "biz-lc-deny-client-biz")
    client_email = "biz-lc-deny-client-user@example.com"
    client_user = User(
        email=client_email,
        password_hash=hash_password("securePass123"),
        full_name="Client User",
        role=UserRole.client,
    )
    db_session.add(client_user)
    await db_session.commit()
    db_session.expire_all()

    login_response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": client_email, "password": "securePass123"},
    )
    assert login_response.status_code == 200
    client_headers = {
        "Authorization": f"Bearer {login_response.json()['tokens']['access_token']}",
    }
    response = await async_client.get(
        _business_legal_consents_path(ctx["business_id"]),
        headers=client_headers,
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_business_owner_can_list_own_consent_records(
    async_client: AsyncClient,
    db_session,
) -> None:
    reg_body = await _register_with_consent(async_client, "biz-lc-own-list")
    business_id = reg_body["business"]["id"]
    headers = {"Authorization": f"Bearer {reg_body['tokens']['access_token']}"}
    response = await async_client.get(
        _business_legal_consents_path(business_id),
        headers=headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["meta"]["total"] >= 1
    assert all(item["business_id"] == business_id for item in body["data"])


@pytest.mark.asyncio
async def test_business_admin_cannot_list_another_business(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx_a = await register_and_get_context(async_client, "biz-lc-cross-a")
    ctx_b = await register_and_get_context(async_client, "biz-lc-cross-b")
    response = await async_client.get(
        _business_legal_consents_path(ctx_b["business_id"]),
        headers=ctx_a["headers"],
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_response_contains_only_data_minimized_fields(
    async_client: AsyncClient,
    db_session,
) -> None:
    reg_body = await _register_with_consent(async_client, "biz-lc-fields")
    business_id = reg_body["business"]["id"]
    headers = {"Authorization": f"Bearer {reg_body['tokens']['access_token']}"}
    response = await async_client.get(
        _business_legal_consents_path(business_id),
        headers=headers,
    )
    assert response.status_code == 200
    assert set(response.json()["data"][0].keys()) == ALLOWED_ITEM_KEYS


@pytest.mark.asyncio
async def test_response_excludes_sensitive_fields(
    async_client: AsyncClient,
    db_session,
) -> None:
    reg_body = await _register_with_consent(async_client, "biz-lc-sensitive")
    business_id = reg_body["business"]["id"]
    headers = {"Authorization": f"Bearer {reg_body['tokens']['access_token']}"}
    response = await async_client.get(
        _business_legal_consents_path(business_id),
        headers=headers,
    )
    assert response.status_code == 200
    raw = response.text.lower()
    for forbidden in (
        "form_data",
        "password_hash",
        "access_token",
        "refresh_token",
        "ip_address",
        "user_agent",
    ):
        assert forbidden not in raw


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_filter_by_source(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    booking_ctx = await _setup_booking_business(async_client, db_session, "biz-lc-src-book")
    create_response = await async_client.post(
        f"/api/v1/public/b/{booking_ctx['slug']}/bookings",
        json=booking_payload(booking_ctx["service_id"]),
    )
    assert create_response.status_code == 201

    response = await async_client.get(
        _business_legal_consents_path(booking_ctx["business_id"]),
        params={"source": ConsentSource.public_booking.value},
        headers=booking_ctx["headers"],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["meta"]["total"] >= 1
    assert all(item["source"] == ConsentSource.public_booking.value for item in body["data"])


@pytest.mark.asyncio
async def test_filter_by_entity_type(
    async_client: AsyncClient,
    db_session,
) -> None:
    order_ctx = await _setup_order_business(async_client, db_session, "biz-lc-ent-order")
    create_response = await async_client.post(
        f"/api/v1/public/b/{order_ctx['slug']}/orders",
        json=order_payload(order_ctx["service_id"]),
    )
    assert create_response.status_code == 201

    response = await async_client.get(
        _business_legal_consents_path(order_ctx["business_id"]),
        params={"entity_type": ConsentEntityType.order.value},
        headers=order_ctx["headers"],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["meta"]["total"] >= 1
    assert all(item["entity_type"] == ConsentEntityType.order.value for item in body["data"])


@pytest.mark.asyncio
async def test_pagination_default_limit(
    async_client: AsyncClient,
    db_session,
) -> None:
    reg_body = await _register_with_consent(async_client, "biz-lc-page-default")
    business_id = reg_body["business"]["id"]
    headers = {"Authorization": f"Bearer {reg_body['tokens']['access_token']}"}
    response = await async_client.get(
        _business_legal_consents_path(business_id),
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["meta"]["limit"] == 25


@pytest.mark.asyncio
async def test_pagination_max_limit(
    async_client: AsyncClient,
    db_session,
) -> None:
    reg_body = await _register_with_consent(async_client, "biz-lc-page-max")
    business_id = reg_body["business"]["id"]
    headers = {"Authorization": f"Bearer {reg_body['tokens']['access_token']}"}

    ok_response = await async_client.get(
        _business_legal_consents_path(business_id),
        params={"limit": 100},
        headers=headers,
    )
    assert ok_response.status_code == 200
    assert ok_response.json()["meta"]["limit"] == 100

    over_response = await async_client.get(
        _business_legal_consents_path(business_id),
        params={"limit": 101},
        headers=headers,
    )
    assert over_response.status_code == 422


@pytest.mark.asyncio
async def test_records_ordered_newest_first(
    async_client: AsyncClient,
    db_session,
) -> None:
    reg_body = await _register_with_consent(async_client, "biz-lc-order-reg")
    business_id = uuid.UUID(reg_body["business"]["id"])
    older_id = uuid.uuid4()
    newer_id = uuid.uuid4()
    now = datetime.now(UTC)
    db_session.add_all(
        [
            LegalConsentRecord(
                id=older_id,
                business_id=business_id,
                source=ConsentSource.public_order.value,
                entity_type=ConsentEntityType.order.value,
                entity_id=uuid.uuid4(),
                legal_consent_version="draft-placeholder-v1",
                accepted_at=now - timedelta(hours=2),
            ),
            LegalConsentRecord(
                id=newer_id,
                business_id=business_id,
                source=ConsentSource.public_booking.value,
                entity_type=ConsentEntityType.booking.value,
                entity_id=uuid.uuid4(),
                legal_consent_version="draft-placeholder-v1",
                accepted_at=now - timedelta(hours=1),
            ),
        ]
    )
    await db_session.commit()
    db_session.expire_all()

    headers = {"Authorization": f"Bearer {reg_body['tokens']['access_token']}"}
    response = await async_client.get(
        _business_legal_consents_path(str(business_id)),
        headers=headers,
    )
    assert response.status_code == 200
    ids = [item["id"] for item in response.json()["data"]]
    assert ids.index(str(newer_id)) < ids.index(str(older_id))


@pytest.mark.asyncio
async def test_empty_result_returns_pagination_metadata(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "biz-lc-empty")
    response = await async_client.get(
        _business_legal_consents_path(ctx["business_id"]),
        params={"source": ConsentSource.public_order.value},
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["data"] == []
    assert body["meta"]["total"] == 0
    assert body["meta"]["limit"] == 25
    assert body["meta"]["page"] == 1


@pytest.mark.asyncio
async def test_endpoint_is_read_only(
    async_client: AsyncClient,
    db_session,
) -> None:
    reg_body = await _register_with_consent(async_client, "biz-lc-readonly")
    business_id = reg_body["business"]["id"]
    headers = {"Authorization": f"Bearer {reg_body['tokens']['access_token']}"}
    before = await _consent_count(db_session)

    response = await async_client.get(
        _business_legal_consents_path(business_id),
        headers=headers,
    )
    assert response.status_code == 200
    assert await _consent_count(db_session) == before


@pytest.mark.asyncio
async def test_tenant_isolation_excludes_other_business_records(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx_a = await register_and_get_context(async_client, "biz-lc-iso-a")
    ctx_b = await register_and_get_context(async_client, "biz-lc-iso-b")

    response = await async_client.get(
        _business_legal_consents_path(ctx_a["business_id"]),
        headers=ctx_a["headers"],
    )
    assert response.status_code == 200
    business_ids = {item["business_id"] for item in response.json()["data"]}
    assert ctx_b["business_id"] not in business_ids
    assert all(bid == ctx_a["business_id"] for bid in business_ids)


@pytest.mark.asyncio
async def test_superadmin_endpoint_still_works(
    async_client: AsyncClient,
    db_session,
) -> None:
    await _register_with_consent(async_client, "biz-lc-sa-still")
    ctx = await register_and_get_context(async_client, "biz-lc-sa-still-sa")
    await _promote_superadmin(db_session, ctx["user_id"])

    response = await async_client.get(SUPERADMIN_LEGAL_CONSENTS_PATH, headers=ctx["headers"])
    assert response.status_code == 200
    assert response.json()["meta"]["total"] >= 1


@pytest.mark.asyncio
async def test_openapi_includes_business_legal_consents_endpoint() -> None:
    from app.main import app

    paths = app.openapi()["paths"]
    assert "/api/v1/businesses/{business_id}/legal-consents" in paths
    assert "get" in paths["/api/v1/businesses/{business_id}/legal-consents"]
