import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_app_imports() -> None:
    assert app.title == "Service Platform API"


def test_health_root(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_v1(client: TestClient) -> None:
    get_settings.cache_clear()
    settings = get_settings()
    response = client.get(f"{settings.api_v1_prefix}/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
