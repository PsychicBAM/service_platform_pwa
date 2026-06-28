import importlib.util
from pathlib import Path

import pytest
from sqlalchemy.orm import RelationshipProperty

from app.database import Base
from app.models import (
    Business,
    BusinessMember,
    EmailVerificationToken,
    OperatingMode,
    PasswordResetToken,
    Subscription,
    SubscriptionPlan,
    User,
)
from app.models.enums import BusinessStatus, SubscriptionStatus, UserRole


def test_models_import_cleanly() -> None:
    assert User.__tablename__ == "users"
    assert Business.__tablename__ == "businesses"
    assert BusinessMember.__tablename__ == "business_members"
    assert Subscription.__tablename__ == "subscriptions"


def test_enum_string_values_match_docs() -> None:
    assert OperatingMode.booking_only.value == "booking_only"
    assert OperatingMode.orders_only.value == "orders_only"
    assert OperatingMode.both.value == "both"

    assert SubscriptionPlan.free.value == "free"
    assert SubscriptionPlan.starter.value == "starter"
    assert SubscriptionPlan.business.value == "business"
    assert SubscriptionPlan.pro.value == "pro"

    assert UserRole.client.value == "client"
    assert BusinessStatus.pending_setup.value == "pending_setup"
    assert SubscriptionStatus.active.value == "active"


def test_metadata_contains_core_tables() -> None:
    table_names = set(Base.metadata.tables.keys())
    assert table_names >= {
        "users",
        "businesses",
        "business_members",
        "subscriptions",
        "email_verification_tokens",
        "password_reset_tokens",
    }


def test_relationships_exist() -> None:
    assert isinstance(Business.__mapper__.relationships.get("members"), RelationshipProperty)
    assert isinstance(Business.__mapper__.relationships.get("subscription"), RelationshipProperty)
    assert isinstance(User.__mapper__.relationships.get("business_members"), RelationshipProperty)
    assert isinstance(
        User.__mapper__.relationships.get("email_verification_tokens"),
        RelationshipProperty,
    )
    assert isinstance(
        EmailVerificationToken.__mapper__.relationships.get("user"),
        RelationshipProperty,
    )
    assert isinstance(
        User.__mapper__.relationships.get("password_reset_tokens"),
        RelationshipProperty,
    )
    assert isinstance(
        PasswordResetToken.__mapper__.relationships.get("user"),
        RelationshipProperty,
    )


def test_app_main_imports_with_email_verification_models() -> None:
    import app.main  # noqa: F401

    assert app.main.app is not None


def test_migration_file_exists_and_imports() -> None:
    migration_path = (
        Path(__file__).resolve().parents[1]
        / "alembic"
        / "versions"
        / "0002_core_tenant_models.py"
    )
    assert migration_path.is_file()

    spec = importlib.util.spec_from_file_location("migration_0002", migration_path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    assert module.revision == "0002"
    assert module.down_revision == "0001"
    assert callable(module.upgrade)
    assert callable(module.downgrade)
