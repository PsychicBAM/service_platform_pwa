from functools import lru_cache
from typing import Literal, Self

from pydantic import AliasChoices, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        populate_by_name=True,
    )

    app_env: Literal["local", "dev", "staging", "production"] = "local"
    app_name: str = "Service Platform API"
    api_v1_prefix: str = "/api/v1"
    api_docs_enabled: bool | None = Field(default=None)
    sqlalchemy_echo: bool = False

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
    email_provider: str = "brevo"
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = Field(
        default=None,
        validation_alias=AliasChoices("SMTP_USER", "SMTP_USERNAME", "smtp_user"),
    )
    smtp_password: str | None = None
    smtp_from_email: str | None = None
    smtp_from_name: str = "Service Platform"
    smtp_use_tls: bool = True
    smtp_use_ssl: bool = False

    email_verification_token_expire_hours: int = 24
    email_verification_base_url: str = "http://localhost:5173/verify-email"
    require_email_verification_for_login: bool = False

    password_reset_token_expire_hours: int = 2
    password_reset_base_url: str = "http://localhost:5173/reset-password"

    review_request_token_expire_days: int = 30
    review_request_base_url: str = "http://localhost:5173/review"

    stripe_enabled: bool = False
    stripe_secret_key: str | None = None
    stripe_webhook_secret: str | None = None
    stripe_price_starter: str | None = None
    stripe_price_business: str | None = None
    stripe_price_pro: str | None = None
    stripe_success_url: str = "http://localhost:5173/billing/success"
    stripe_cancel_url: str = "http://localhost:5173/billing/cancel"

    mini_site_upload_root: str = "data/uploads"

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
        for issue in self.email_config_issue_codes():
            if issue == "SMTP_HOST_MISSING":
                raise ValueError(
                    "SMTP_HOST is required when EMAIL_ENABLED=true and EMAIL_DRY_RUN=false"
                )
            if issue == "SMTP_FROM_EMAIL_MISSING":
                raise ValueError(
                    "SMTP_FROM_EMAIL is required when EMAIL_ENABLED=true and EMAIL_DRY_RUN=false"
                )
            if issue == "SMTP_USERNAME_MISSING":
                raise ValueError(
                    "SMTP_USER/SMTP_USERNAME is required when EMAIL_ENABLED=true "
                    "and EMAIL_DRY_RUN=false"
                )
            if issue == "SMTP_PASSWORD_MISSING":
                raise ValueError(
                    "SMTP_PASSWORD is required when EMAIL_ENABLED=true and EMAIL_DRY_RUN=false"
                )

    @property
    def live_smtp_send_enabled(self) -> bool:
        return self.email_enabled and not self.email_dry_run

    def email_config_issue_codes(self) -> list[str]:
        """Static issue codes for SMTP readiness — never includes secret values."""
        if not self.live_smtp_send_enabled:
            return []
        issues: list[str] = []
        if not (self.smtp_host or "").strip():
            issues.append("SMTP_HOST_MISSING")
        if not (self.smtp_from_email or "").strip():
            issues.append("SMTP_FROM_EMAIL_MISSING")
        smtp_port = self.smtp_port
        if not isinstance(smtp_port, int) or smtp_port < 1 or smtp_port > 65535:
            issues.append("SMTP_PORT_INVALID")
        if not (self.smtp_user or "").strip():
            issues.append("SMTP_USERNAME_MISSING")
        if not (self.smtp_password or "").strip():
            issues.append("SMTP_PASSWORD_MISSING")
        return issues

    @property
    def smtp_is_configured(self) -> bool:
        """True when required SMTP fields are present (independent of dry-run)."""
        if not (self.smtp_host or "").strip():
            return False
        if not (self.smtp_from_email or "").strip():
            return False
        if not (self.smtp_user or "").strip():
            return False
        if not (self.smtp_password or "").strip():
            return False
        if not isinstance(self.smtp_port, int) or self.smtp_port < 1 or self.smtp_port > 65535:
            return False
        return True


@lru_cache
def get_settings() -> Settings:
    return Settings()
