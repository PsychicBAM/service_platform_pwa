from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_env: Literal["local", "dev", "staging", "production"] = "local"
    app_name: str = "Service Platform API"
    api_v1_prefix: str = "/api/v1"

    database_url: str = (
        "postgresql+asyncpg://service_platform:service_platform"
        "@postgres:5432/service_platform"
    )

    jwt_secret_key: str = "change_me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 30

    cors_origins: str = Field(
        default="http://localhost:5173,http://localhost:3000",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def normalize_cors_origins(cls, value: str | list[str]) -> str:
        if isinstance(value, list):
            return ",".join(value)
        return str(value)

    @property
    def docs_enabled(self) -> bool:
        return self.app_env in {"local", "dev"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
