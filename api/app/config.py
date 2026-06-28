from functools import lru_cache
from typing import Literal, Self

from pydantic import Field, field_validator, model_validator
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
    api_docs_enabled: bool | None = Field(default=None)

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

    email_enabled: bool = False
    email_dry_run: bool = True
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str | None = None
    smtp_from_name: str = "Service Platform"
    smtp_use_tls: bool = True

    email_verification_token_expire_hours: int = 24
    email_verification_base_url: str = "http://localhost:5173/verify-email"
    require_email_verification_for_login: bool = False

    password_reset_token_expire_hours: int = 2
    password_reset_base_url: str = "http://localhost:5173/reset-password"

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
        if self.api_docs_enabled is not None:
            return self.api_docs_enabled
        return self.app_env in {"local", "dev"}

    @model_validator(mode="after")
    def validate_production_security(self) -> Self:
        if self.app_env != "production":
            return self
        self._validate_production_cors()
        self._validate_production_email()
        return self

    def _validate_production_cors(self) -> None:
        origins = self.cors_origins_list
        if not origins:
            raise ValueError("CORS_ORIGINS must be set when APP_ENV=production")
        if any(origin == "*" for origin in origins):
            raise ValueError("Wildcard CORS origin is not allowed in production")

    def _validate_production_email(self) -> None:
        if not self.email_enabled or self.email_dry_run:
            return
        if not self.smtp_host:
            raise ValueError(
                "SMTP_HOST is required when EMAIL_ENABLED=true and EMAIL_DRY_RUN=false"
            )
        if not self.smtp_from_email:
            raise ValueError(
                "SMTP_FROM_EMAIL is required when EMAIL_ENABLED=true and EMAIL_DRY_RUN=false"
            )
        if self.smtp_user and not self.smtp_password:
            raise ValueError(
                "SMTP_PASSWORD is required when SMTP_USER is set in production"
            )


@lru_cache
def get_settings() -> Settings:
    return Settings()
