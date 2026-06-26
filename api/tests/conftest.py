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
    session_factory = async_sessionmaker(
        db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with session_factory() as session:
        yield session


@pytest_asyncio.fixture
async def clean_auth_tables(db_session):
    yield
    await db_session.execute(text("DELETE FROM subscriptions"))
    await db_session.execute(text("DELETE FROM business_members"))
    await db_session.execute(text("DELETE FROM businesses"))
    await db_session.execute(text("DELETE FROM users"))
    await db_session.commit()


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
    token = suffix or uuid.uuid4().hex[:8]
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
    }
