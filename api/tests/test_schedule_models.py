import importlib.util
from pathlib import Path

from app.database import Base
from app.models import UnavailableTime, WorkingBreak, WorkingHour


def test_schedule_models_import() -> None:
    assert WorkingHour.__tablename__ == "working_hours"
    assert WorkingBreak.__tablename__ == "working_breaks"
    assert UnavailableTime.__tablename__ == "unavailable_times"


def test_metadata_contains_schedule_tables() -> None:
    table_names = set(Base.metadata.tables.keys())
    assert table_names >= {
        "working_hours",
        "working_breaks",
        "unavailable_times",
    }


def test_migration_0004_exists_and_imports() -> None:
    migration_path = (
        Path(__file__).resolve().parents[1]
        / "alembic"
        / "versions"
        / "0004_schedule.py"
    )
    assert migration_path.is_file()

    spec = importlib.util.spec_from_file_location("migration_0004", migration_path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    assert module.revision == "0004"
    assert module.down_revision == "0003"
    assert callable(module.upgrade)
    assert callable(module.downgrade)
