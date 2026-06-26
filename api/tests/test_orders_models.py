import importlib.util
import uuid
from pathlib import Path

from sqlalchemy.orm import RelationshipProperty

from app.database import Base
from app.models import Business, Client, Order, OrderMessage, Service
from app.models.enums import OrderMessageSenderType, OrderStatus


def test_models_import_and_metadata_contains_orders() -> None:
    assert Order.__tablename__ == "orders"
    assert OrderMessage.__tablename__ == "order_messages"
    table_names = set(Base.metadata.tables.keys())
    assert "orders" in table_names
    assert "order_messages" in table_names


def test_migration_0006_exists_and_imports() -> None:
    migration_path = (
        Path(__file__).resolve().parents[1]
        / "alembic"
        / "versions"
        / "0006_orders.py"
    )
    assert migration_path.is_file()

    spec = importlib.util.spec_from_file_location("migration_0006", migration_path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    assert module.revision == "0006"
    assert module.down_revision == "0005"
    assert callable(module.upgrade)
    assert callable(module.downgrade)


def test_order_status_enum_values_match_docs() -> None:
    assert OrderStatus.submitted.value == "submitted"
    assert OrderStatus.pending_payment.value == "pending_payment"
    assert OrderStatus.accepted.value == "accepted"
    assert OrderStatus.in_progress.value == "in_progress"
    assert OrderStatus.completed.value == "completed"
    assert OrderStatus.declined.value == "declined"
    assert OrderStatus.cancelled.value == "cancelled"


def test_order_message_sender_type_enum_values_match_docs() -> None:
    assert OrderMessageSenderType.client.value == "client"
    assert OrderMessageSenderType.admin.value == "admin"


def test_order_relationships_exist() -> None:
    assert isinstance(Business.__mapper__.relationships.get("orders"), RelationshipProperty)
    assert isinstance(Business.__mapper__.relationships.get("order_messages"), RelationshipProperty)
    assert isinstance(Service.__mapper__.relationships.get("orders"), RelationshipProperty)
    assert isinstance(Client.__mapper__.relationships.get("orders"), RelationshipProperty)
    assert isinstance(Order.__mapper__.relationships.get("messages"), RelationshipProperty)
