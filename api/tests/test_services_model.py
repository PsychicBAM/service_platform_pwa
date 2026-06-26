import importlib.util
from pathlib import Path

from sqlalchemy.orm import RelationshipProperty

from app.database import Base
from app.models import Service
from app.models.enums import PriceType, ServiceType


def test_service_model_imports() -> None:
    assert Service.__tablename__ == "services"


def test_metadata_contains_services_table() -> None:
    assert "services" in Base.metadata.tables


def test_service_enums() -> None:
    assert ServiceType.booking.value == "booking"
    assert ServiceType.order.value == "order"
    assert PriceType.fixed.value == "fixed"
    assert PriceType.free.value == "free"
    assert PriceType.quote.value == "quote"


def test_service_relationships_exist() -> None:
    assert isinstance(
        Service.__mapper__.relationships.get("business"),
        RelationshipProperty,
    )


def test_migration_0003_exists_and_imports() -> None:
    migration_path = (
        Path(__file__).resolve().parents[1]
        / "alembic"
        / "versions"
        / "0003_services.py"
    )
    assert migration_path.is_file()

    spec = importlib.util.spec_from_file_location("migration_0003", migration_path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    assert module.revision == "0003"
    assert module.down_revision == "0002"
    assert callable(module.upgrade)
    assert callable(module.downgrade)
