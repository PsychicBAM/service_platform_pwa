from app.config import Settings, get_settings


def test_settings_load_with_defaults() -> None:
    get_settings.cache_clear()
    settings = get_settings()
    assert isinstance(settings, Settings)


def test_app_name_exists() -> None:
    get_settings.cache_clear()
    settings = get_settings()
    assert settings.app_name == "Service Platform API"


def test_database_url_exists() -> None:
    get_settings.cache_clear()
    settings = get_settings()
    assert settings.database_url
    assert "postgresql+asyncpg://" in settings.database_url


def test_jwt_secret_key_exists() -> None:
    get_settings.cache_clear()
    settings = get_settings()
    assert settings.jwt_secret_key


def test_api_v1_prefix_exists() -> None:
    get_settings.cache_clear()
    settings = get_settings()
    assert settings.api_v1_prefix == "/api/v1"
