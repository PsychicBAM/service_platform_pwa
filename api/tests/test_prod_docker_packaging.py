from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[2]
COMPOSE_PROD = PROJECT_ROOT / "docker-compose.prod.yml"
DOCKERFILE_PROD = PROJECT_ROOT / "api" / "Dockerfile.prod"
CONTAINER_SCRIPT = Path("/scripts/check_production_env.py")


def test_prod_compose_uses_dockerfile_prod() -> None:
    if not COMPOSE_PROD.is_file():
        pytest.skip("docker-compose.prod.yml not available in this environment")
    content = COMPOSE_PROD.read_text(encoding="utf-8")
    assert "dockerfile: api/Dockerfile.prod" in content
    assert "context: ." in content


def test_dockerfile_prod_copies_check_production_env_script() -> None:
    if not DOCKERFILE_PROD.is_file():
        pytest.skip("api/Dockerfile.prod not available in this environment")
    content = DOCKERFILE_PROD.read_text(encoding="utf-8")
    assert "COPY scripts/check_production_env.py /scripts/check_production_env.py" in content
    assert "COPY .env.production.example /.env.production.example" in content


def test_check_production_env_script_available_in_prod_image() -> None:
    if not CONTAINER_SCRIPT.is_file():
        pytest.skip("Not running inside prod API image")
    assert CONTAINER_SCRIPT.is_file()
