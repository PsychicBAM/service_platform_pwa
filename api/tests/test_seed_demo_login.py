import importlib.util
import asyncio
from pathlib import Path

import pytest
from app.models.enums import UserRole
from app.repositories.user_repository import UserRepository
from app.services.password_service import hash_password, verify_password


def _load_seed_demo():
    api_dir = Path(__file__).resolve().parents[1]
    path = api_dir / "scripts" / "seed_demo.py"
    spec = importlib.util.spec_from_file_location("seed_demo", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.mark.asyncio
async def test_ensure_user_resets_existing_demo_password(db_session) -> None:
    module = _load_seed_demo()
    users = UserRepository(db_session)
    stale_hash = hash_password("WrongPass123!")
    await users.create(
        email=module.OWNER_EMAIL,
        password_hash=stale_hash,
        full_name="Stale Owner",
        phone=None,
        role=UserRole.business_admin,
    )
    await db_session.commit()

    user, action = await module._ensure_user(
        db_session,
        users,
        email=module.OWNER_EMAIL,
        password=module.DEMO_PASSWORD,
        role=UserRole.business_admin,
        full_name="Demo Owner",
    )
    await db_session.commit()

    assert action == "updated"
    assert user.is_active is True
    assert verify_password(module.DEMO_PASSWORD, user.password_hash or "")
    assert not verify_password("WrongPass123!", user.password_hash or "")


@pytest.mark.asyncio
async def test_ensure_user_sets_email_verified_for_demo_users(db_session) -> None:
    module = _load_seed_demo()
    users = UserRepository(db_session)
    user, _action = await module._ensure_user(
        db_session,
        users,
        email="seed-verified-demo@example.com",
        password=module.DEMO_PASSWORD,
        role=UserRole.client,
        full_name="Seed Verified Demo User",
    )
    assert user.email_verified_at is not None

    user.email_verified_at = None
    user.is_active = False
    await db_session.flush()

    user, action = await module._ensure_user(
        db_session,
        users,
        email="seed-verified-demo@example.com",
        password=module.DEMO_PASSWORD,
        role=UserRole.client,
        full_name="Seed Verified Demo User",
    )
    assert action == "updated"
    assert user.email_verified_at is not None
    assert user.is_active is True


def test_seed_demo_summary_does_not_print_demo_password(capsys) -> None:
    module = _load_seed_demo()
    module._print_summary(
        {
            "summary": {"owner": "updated"},
            "business_id": "00000000-0000-0000-0000-000000000001",
            "booking_service_id": "00000000-0000-0000-0000-000000000002",
            "order_service_id": "00000000-0000-0000-0000-000000000003",
        }
    )
    captured = capsys.readouterr()
    assert module.DEMO_PASSWORD not in captured.out
    assert "README_BACKEND.md" in captured.out
    assert "Demo users are ready" in captured.out


@pytest.mark.asyncio
async def test_ensure_user_keeps_existing_demo_user_usable_after_reseed(db_session) -> None:
    module = _load_seed_demo()
    users = UserRepository(db_session)
    user, first_action = await module._ensure_user(
        db_session,
        users,
        email=module.LINKED_CLIENT_EMAIL,
        password=module.DEMO_PASSWORD,
        role=UserRole.client,
        full_name="Client Demo",
        phone=module.LINKED_CLIENT_PHONE,
    )
    first_id = user.id
    await db_session.commit()

    user, second_action = await module._ensure_user(
        db_session,
        users,
        email=module.LINKED_CLIENT_EMAIL,
        password=module.DEMO_PASSWORD,
        role=UserRole.client,
        full_name="Client Demo",
        phone=module.LINKED_CLIENT_PHONE,
    )
    await db_session.commit()

    assert first_action == "created"
    assert second_action == "updated"
    assert user.id == first_id
    assert user.is_active is True
    assert user.email_verified_at is not None
    assert verify_password(module.DEMO_PASSWORD, user.password_hash or "")


def test_refuse_production_seed_when_app_env_production(monkeypatch) -> None:
    module = _load_seed_demo()
    monkeypatch.setenv("APP_ENV", "production")

    assert module._refuse_production_seed() is True


def test_refuse_production_seed_allows_local(monkeypatch) -> None:
    module = _load_seed_demo()
    monkeypatch.setenv("APP_ENV", "local")

    assert module._refuse_production_seed() is False


def test_main_refuses_production_without_seeding(monkeypatch, capsys) -> None:
    module = _load_seed_demo()
    monkeypatch.setenv("APP_ENV", "production")

    exit_code = asyncio.run(module.main())

    captured = capsys.readouterr()
    assert exit_code == 1
    assert module.PRODUCTION_GUARD_MESSAGE in captured.err
    assert module.DEMO_PASSWORD not in captured.out
    assert module.DEMO_PASSWORD not in captured.err
    assert "Demo seed complete." not in captured.out


def test_refuse_production_seed_when_app_env_production(monkeypatch) -> None:
    module = _load_seed_demo()
    monkeypatch.setenv("APP_ENV", "production")

    assert module._refuse_production_seed() is True


def test_refuse_production_seed_allows_local(monkeypatch) -> None:
    module = _load_seed_demo()
    monkeypatch.setenv("APP_ENV", "local")

    assert module._refuse_production_seed() is False


def test_main_refuses_production_without_seeding(monkeypatch, capsys) -> None:
    module = _load_seed_demo()
    monkeypatch.setenv("APP_ENV", "production")

    exit_code = asyncio.run(module.main())

    captured = capsys.readouterr()
    assert exit_code == 1
    assert module.PRODUCTION_GUARD_MESSAGE in captured.err
    assert module.DEMO_PASSWORD not in captured.out
    assert module.DEMO_PASSWORD not in captured.err
    assert "Demo seed complete." not in captured.out
