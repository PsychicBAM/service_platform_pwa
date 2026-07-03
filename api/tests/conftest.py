import os
import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings
from app.database import get_db
from app.main import app


def _test_database_url() -> str:
    return os.getenv("TEST_DATABASE_URL", get_settings().database_url)


def _session_factory(db_engine):
    return async_sessionmaker(
        db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


_AUTH_TABLES = (
    "password_reset_tokens",
    "email_verification_tokens",
    "audit_logs",
    "order_messages",
    "orders",
    "bookings",
    "clients",
    "unavailable_times",
    "working_breaks",
    "working_hours",
    "services",
    "subscriptions",
    "business_members",
    "businesses",
    "users",
)


async def _purge_auth_tables_on_session(session: AsyncSession) -> None:
    for table in _AUTH_TABLES:
        await session.execute(text(f"DELETE FROM {table}"))
    await session.commit()


def assert_has_bearer_auth(headers: dict) -> None:
    auth = headers.get("Authorization", "")
    assert auth.startswith("Bearer "), "Authorization header missing or not Bearer"
    token = auth.removeprefix("Bearer ").strip()
    assert token, "Bearer token is empty"


def assert_response_status(response, expected: int, *, context: str) -> None:
    if response.status_code == expected:
        return
    error_code = "n/a"
    try:
        error_code = response.json().get("error", {}).get("code", error_code)
    except Exception:
        pass
    raise AssertionError(
        f"{context}: expected status {expected}, got {response.status_code}; "
        f"error_code={error_code}"
    )


@pytest.fixture(autouse=True)
def reset_settings_cache() -> None:
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture(autouse=True)
def reset_dependency_overrides() -> None:
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def db_engine():
    engine = create_async_engine(_test_database_url(), pool_pre_ping=True)
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as exc:
        await engine.dispose()
        pytest.skip(f"PostgreSQL test database unavailable: {exc}")
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(db_engine):
    factory = _session_factory(db_engine)
    async with factory() as session:
        yield session


@pytest_asyncio.fixture
async def clean_auth_tables(db_engine, db_session):
    factory = _session_factory(db_engine)

    async def _reset_db_state() -> None:
        await db_session.rollback()
        db_session.expire_all()
        async with factory() as purge_session:
            await _purge_auth_tables_on_session(purge_session)

    await _reset_db_state()
    yield
    await _reset_db_state()


@pytest_asyncio.fixture
async def async_client(db_session, clean_auth_tables):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()


def register_payload(suffix: str | None = None) -> dict:
    unique = uuid.uuid4().hex[:8]
    token = f"{suffix}-{unique}" if suffix else unique
    return {
        "email": f"owner-{token}@example.com",
        "password": "securePass123",
        "full_name": "Maria Garcia",
        "phone": "+15550100",
        "business": {
            "name": "Joe's Salon",
            "slug": f"joes-salon-{token}",
            "operating_mode": "both",
            "timezone": "America/New_York",
        },
        "legal_consent_accepted": True,
    }


async def register_and_get_context(client, suffix: str | None = None) -> dict:
    payload = register_payload(suffix)
    response = await client.post("/api/v1/auth/register", json=payload)
    assert_response_status(response, 201, context="business registration")
    body = response.json()
    assert body.get("tokens", {}).get("access_token"), "registration response missing access token"
    assert body.get("business", {}).get("id"), "registration response missing business id"
    assert body.get("user", {}).get("id"), "registration response missing user id"
    token = body["tokens"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    assert_has_bearer_auth(headers)
    return {
        "payload": payload,
        "token": token,
        "headers": headers,
        "business_id": body["business"]["id"],
        "slug": body["business"]["slug"],
        "user_id": body["user"]["id"],
    }


async def refresh_owner_auth(client, ctx: dict) -> dict:
    """Re-login after direct db_session mutations so API auth reads committed state."""
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": ctx["payload"]["email"],
            "password": ctx["payload"]["password"],
        },
    )
    assert_response_status(response, 200, context="refresh owner login")
    token = response.json()["tokens"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    assert_has_bearer_auth(headers)
    ctx["token"] = token
    ctx["headers"] = headers
    return ctx


BOOKING_SERVICE_PAYLOAD = {
    "name": "Haircut",
    "description": "Standard haircut",
    "type": "booking",
    "duration_minutes": 30,
    "price_cents": 2500,
    "currency": "USD",
    "price_type": "fixed",
}

ORDER_SERVICE_PAYLOAD = {
    "name": "Logo Design",
    "description": "Custom logo package",
    "type": "order",
    "price_cents": 15000,
    "currency": "USD",
    "price_type": "fixed",
}


def weekday_working_hours_payload() -> dict:
    hours = []
    for day in range(7):
        is_open = day in (1, 2, 3, 4, 5)
        hours.append(
            {
                "day_of_week": day,
                "is_open": is_open,
                "opens_at": "09:00" if is_open else None,
                "closes_at": "17:00" if is_open else None,
            }
        )
    return {"working_hours": hours}


async def activate_business(db_session, slug: str) -> None:
    from sqlalchemy import update

    from app.models.business import Business
    from app.models.enums import BusinessStatus

    await db_session.execute(
        update(Business)
        .where(Business.slug == slug)
        .values(status=BusinessStatus.active)
    )
    await db_session.commit()
    db_session.expire_all()
