import importlib.util
import uuid
from pathlib import Path

from sqlalchemy.orm import RelationshipProperty

from app.database import Base
from app.models import Booking, Business, Client, Service, User
from app.models.enums import (
    BookingStatus,
    CancelledBy,
    ClientSource,
)


def test_models_import_and_metadata_contains_clients_bookings() -> None:
    assert Client.__tablename__ == "clients"
    assert Booking.__tablename__ == "bookings"
    table_names = set(Base.metadata.tables.keys())
    assert "clients" in table_names
    assert "bookings" in table_names


def test_migration_0005_exists_and_imports() -> None:
    migration_path = (
        Path(__file__).resolve().parents[1]
        / "alembic"
        / "versions"
        / "0005_clients_bookings.py"
    )
    assert migration_path.is_file()

    spec = importlib.util.spec_from_file_location("migration_0005", migration_path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    assert module.revision == "0005"
    assert module.down_revision == "0004"
    assert callable(module.upgrade)
    assert callable(module.downgrade)


def test_booking_status_enum_values_match_docs() -> None:
    assert BookingStatus.pending.value == "pending"
    assert BookingStatus.pending_payment.value == "pending_payment"
    assert BookingStatus.confirmed.value == "confirmed"
    assert BookingStatus.completed.value == "completed"
    assert BookingStatus.cancelled.value == "cancelled"
    assert BookingStatus.no_show.value == "no_show"


def test_client_source_and_cancelled_by_enums() -> None:
    assert ClientSource.registered.value == "registered"
    assert ClientSource.guest.value == "guest"
    assert ClientSource.admin_created.value == "admin_created"
    assert CancelledBy.client.value == "client"
    assert CancelledBy.admin.value == "admin"
    assert CancelledBy.system.value == "system"


def test_client_relationships_exist() -> None:
    assert isinstance(Business.__mapper__.relationships.get("clients"), RelationshipProperty)
    assert isinstance(User.__mapper__.relationships.get("clients"), RelationshipProperty)
    assert isinstance(Client.__mapper__.relationships.get("bookings"), RelationshipProperty)


def test_booking_relationships_exist() -> None:
    assert isinstance(Business.__mapper__.relationships.get("bookings"), RelationshipProperty)
    assert isinstance(Service.__mapper__.relationships.get("bookings"), RelationshipProperty)
    assert isinstance(Client.__mapper__.relationships.get("bookings"), RelationshipProperty)
