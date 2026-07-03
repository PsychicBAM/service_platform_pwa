import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select

from app.models.enums import ConsentEntityType, ConsentSource
from app.models.legal_consent_record import LegalConsentRecord
from tests.conftest import register_and_get_context, register_payload
from tests.test_bookings_availability_blocking import FIXED_NOW, _setup_booking_business
from tests.test_public_booking_create import booking_payload
from tests.test_public_order_create import _setup_order_business, order_payload
from tests.test_superadmin_routes import _promote_superadmin

LEGAL_CONSENTS_PATH = "/api/v1/superadmin/legal-consents"

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

FORBIDDEN_ITEM_KEYS = {
    "form_data",
    "password",
    "password_hash",
    "access_token",
    "refresh_token",
    "token",
    "metadata",
    "log_metadata",
    "settings",
    "email",
    "phone",
    "full_name",
    "ip_address",
    "user_agent",
}


async def _consent_count(db_session) -> int:
    return (await db_session.execute(select(func.count()).select_from(LegalConsentRecord))).scalar_one()


async def _register_with_consent(async_client: AsyncClient, suffix: str) -> dict:
    response = await async_client.post("/api/v1/auth/register", json=register_payload(suffix))
    assert response.status_code == 201
    return response.json()


async def _superadmin_headers(async_client: AsyncClient, db_session, suffix: str) -> dict:
    ctx = await register_and_get_context(async_client, suffix)
    await _promote_superadmin(db_session, ctx["user_id"])
    return ctx["headers"]


@pytest.mark.asyncio
async def test_anonymous_request_rejected(async_client: AsyncClient) -> None:
    response = await async_client.get(LEGAL_CONSENTS_PATH)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_business_admin_request_rejected(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "sa-lc-deny-admin")
    response = await async_client.get(LEGAL_CONSENTS_PATH, headers=ctx["headers"])
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_superadmin_can_list_consent_records(
    async_client: AsyncClient,
    db_session,
) -> None:
    await _register_with_consent(async_client, "sa-lc-list")
    headers = await _superadmin_headers(async_client, db_session, "sa-lc-list-sa")

    response = await async_client.get(LEGAL_CONSENTS_PATH, headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["meta"]["total"] >= 1
    assert len(body["data"]) >= 1
    assert body["data"][0]["source"] == ConsentSource.registration.value


@pytest.mark.asyncio
async def test_response_contains_only_data_minimized_fields(
    async_client: AsyncClient,
    db_session,
) -> None:
    await _register_with_consent(async_client, "sa-lc-fields")
    headers = await _superadmin_headers(async_client, db_session, "sa-lc-fields-sa")

    response = await async_client.get(LEGAL_CONSENTS_PATH, headers=headers)
    assert response.status_code == 200
    item = response.json()["data"][0]
    assert set(item.keys()) == ALLOWED_ITEM_KEYS


@pytest.mark.asyncio
async def test_response_excludes_sensitive_fields(
    async_client: AsyncClient,
    db_session,
) -> None:
    await _register_with_consent(async_client, "sa-lc-sensitive")
    headers = await _superadmin_headers(async_client, db_session, "sa-lc-sensitive-sa")

    response = await async_client.get(LEGAL_CONSENTS_PATH, headers=headers)
    assert response.status_code == 200
    raw = response.text.lower()
    for forbidden in FORBIDDEN_ITEM_KEYS:
        assert forbidden not in raw


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_filter_by_source(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    booking_ctx = await _setup_booking_business(async_client, db_session, "sa-lc-src-book")
    create_booking_response = await async_client.post(
        f"/api/v1/public/b/{booking_ctx['slug']}/bookings",
        json=booking_payload(booking_ctx["service_id"]),
    )
    assert create_booking_response.status_code == 201
    await _register_with_consent(async_client, "sa-lc-src-reg")
    headers = await _superadmin_headers(async_client, db_session, "sa-lc-src-sa")

    booking_response = await async_client.get(
        LEGAL_CONSENTS_PATH,
        params={"source": ConsentSource.public_booking.value},
        headers=headers,
    )
    assert booking_response.status_code == 200
    booking_body = booking_response.json()
    assert booking_body["meta"]["total"] >= 1
    assert all(item["source"] == ConsentSource.public_booking.value for item in booking_body["data"])

    reg_response = await async_client.get(
        LEGAL_CONSENTS_PATH,
        params={"source": ConsentSource.registration.value},
        headers=headers,
    )
    assert reg_response.status_code == 200
    reg_body = reg_response.json()
    assert reg_body["meta"]["total"] >= 1
    assert all(item["source"] == ConsentSource.registration.value for item in reg_body["data"])


@pytest.mark.asyncio
async def test_filter_by_entity_type(
    async_client: AsyncClient,
    db_session,
) -> None:
    order_ctx = await _setup_order_business(async_client, db_session, "sa-lc-ent-order")
    order_response = await async_client.post(
        f"/api/v1/public/b/{order_ctx['slug']}/orders",
        json=order_payload(order_ctx["service_id"]),
    )
    assert order_response.status_code == 201
    headers = await _superadmin_headers(async_client, db_session, "sa-lc-ent-sa")

    response = await async_client.get(
        LEGAL_CONSENTS_PATH,
        params={"entity_type": ConsentEntityType.order.value},
        headers=headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["meta"]["total"] >= 1
    assert all(item["entity_type"] == ConsentEntityType.order.value for item in body["data"])


@pytest.mark.asyncio
async def test_filter_by_business_id(
    async_client: AsyncClient,
    db_session,
) -> None:
    reg_body = await _register_with_consent(async_client, "sa-lc-biz-filter")
    business_id = reg_body["business"]["id"]
    await _register_with_consent(async_client, "sa-lc-biz-other")
    headers = await _superadmin_headers(async_client, db_session, "sa-lc-biz-sa")

    response = await async_client.get(
        LEGAL_CONSENTS_PATH,
        params={"business_id": business_id},
        headers=headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["meta"]["total"] == 1
    assert body["data"][0]["business_id"] == business_id


@pytest.mark.asyncio
async def test_pagination_default_limit(
    async_client: AsyncClient,
    db_session,
) -> None:
    headers = await _superadmin_headers(async_client, db_session, "sa-lc-page-default")
    response = await async_client.get(LEGAL_CONSENTS_PATH, headers=headers)
    assert response.status_code == 200
    assert response.json()["meta"]["limit"] == 25


@pytest.mark.asyncio
async def test_pagination_max_limit(
    async_client: AsyncClient,
    db_session,
) -> None:
    headers = await _superadmin_headers(async_client, db_session, "sa-lc-page-max")

    ok_response = await async_client.get(
        LEGAL_CONSENTS_PATH,
        params={"limit": 100},
        headers=headers,
    )
    assert ok_response.status_code == 200
    assert ok_response.json()["meta"]["limit"] == 100

    over_response = await async_client.get(
        LEGAL_CONSENTS_PATH,
        params={"limit": 101},
        headers=headers,
    )
    assert over_response.status_code == 422


@pytest.mark.asyncio
async def test_records_ordered_newest_first(
    async_client: AsyncClient,
    db_session,
) -> None:
    reg_body = await _register_with_consent(async_client, "sa-lc-order-reg")
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

    headers = await _superadmin_headers(async_client, db_session, "sa-lc-order-sa")
    response = await async_client.get(
        LEGAL_CONSENTS_PATH,
        params={"business_id": str(business_id)},
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
    headers = await _superadmin_headers(async_client, db_session, "sa-lc-empty-sa")
    response = await async_client.get(
        LEGAL_CONSENTS_PATH,
        params={"business_id": str(uuid.uuid4())},
        headers=headers,
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
    await _register_with_consent(async_client, "sa-lc-readonly")
    headers = await _superadmin_headers(async_client, db_session, "sa-lc-readonly-sa")
    before = await _consent_count(db_session)

    response = await async_client.get(LEGAL_CONSENTS_PATH, headers=headers)
    assert response.status_code == 200

    after = await _consent_count(db_session)
    assert after == before


@pytest.mark.asyncio
async def test_invalid_source_returns_validation_error(
    async_client: AsyncClient,
    db_session,
) -> None:
    headers = await _superadmin_headers(async_client, db_session, "sa-lc-invalid-src")
    response = await async_client.get(
        LEGAL_CONSENTS_PATH,
        params={"source": "not-a-valid-source"},
        headers=headers,
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_openapi_includes_legal_consents_endpoint() -> None:
    from app.main import app

    paths = app.openapi()["paths"]
    assert "/api/v1/superadmin/legal-consents" in paths
    assert "get" in paths["/api/v1/superadmin/legal-consents"]
