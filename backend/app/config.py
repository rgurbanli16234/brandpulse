"""Application settings, loaded from environment variables (and a .env file)."""

from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Insecure value used by local development only. Production refuses to boot with it.
DEV_JWT_SECRET = "dev-secret-change-me"
# Minimum length accepted for a production JWT signing key.
MIN_PRODUCTION_JWT_SECRET_LENGTH = 32
# Dev-only convenience pattern; ignored in production unless the operator sets a
# different CORS_ORIGIN_REGEX explicitly.
DEV_CORS_ORIGIN_REGEX = r"http://(localhost|127\.0\.0\.1)(:\d+)?"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "../.env"), extra="ignore")

    app_name: str = "BrandPulse"

    # "development" (default) or "production". In production insecure defaults are
    # rejected at startup instead of silently leaking into a deploy.
    environment: str = "development"

    # Single database; swap to Postgres by setting DATABASE_URL.
    database_url: str = "sqlite:///./brandpulse.db"

    # Auth
    jwt_secret: str = DEV_JWT_SECRET
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days

    # CORS (comma-separated origins). Includes the Vite dev server on 8080.
    cors_origins: str = (
        "http://localhost:8080,http://127.0.0.1:8080,"
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
    )
    # Dev convenience: accept any localhost / 127.0.0.1 origin on any port.
    # Ignored in production (see effective_cors_origin_regex) so a deploy never
    # accepts localhost origins; set CORS_ORIGIN_REGEX explicitly to override.
    cors_origin_regex: str = DEV_CORS_ORIGIN_REGEX

    # Analyzer: "rules" (default, zero downloads) or "hf" (optional model).
    analyzer: str = "rules"
    hf_model: str = "cardiffnlp/twitter-xlm-roberta-base-sentiment"

    # Hosted deployments: serve an already-built SPA from this directory at "/".
    # Unset locally (the Vite dev server serves the frontend instead).
    frontend_dir: str | None = None
    # Seed demo data on startup when the database has no business yet. The Space disk
    # is ephemeral, so this keeps the hosted dashboard from ever being empty.
    auto_seed: bool = False

    # Pipeline / clustering / scoring thresholds
    pipeline_interval_minutes: int = 15
    enable_scheduler: bool = True
    clustering_threshold: float = 0.62
    clustering_window_hours: int = 48
    spike_multiplier: float = 2.0
    alert_cooldown_minutes: int = 60

    # Alert delivery (all optional; in-app alerts always work)
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from: str | None = None

    # Optional LLM summary for alerts (template summary is the default).
    llm_api_key: str | None = None

    @property
    def is_production(self) -> bool:
        return self.environment.strip().lower() in {"production", "prod"}

    @model_validator(mode="after")
    def _reject_insecure_production_defaults(self) -> "Settings":
        """Refuse to start in production with an insecure JWT signing key."""
        if not self.is_production:
            return self
        if self.jwt_secret == DEV_JWT_SECRET:
            raise ValueError(
                "JWT_SECRET is still the development default. Set JWT_SECRET to a long "
                "random value (e.g. `python -c \"import secrets; print(secrets.token_urlsafe(48))\"`) "
                "or run with ENVIRONMENT=development."
            )
        if len(self.jwt_secret) < MIN_PRODUCTION_JWT_SECRET_LENGTH:
            raise ValueError(
                f"JWT_SECRET must be at least {MIN_PRODUCTION_JWT_SECRET_LENGTH} characters "
                "in production."
            )
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def effective_cors_origin_regex(self) -> str | None:
        """The CORS origin regex to apply, or None to disable regex matching.

        Production never inherits the built-in dev pattern, so a deploy cannot
        accidentally accept localhost origins. An operator can still opt in by
        setting CORS_ORIGIN_REGEX to a *different* value.
        """
        value = (self.cors_origin_regex or "").strip()
        if not value:
            return None
        if self.is_production and value == DEV_CORS_ORIGIN_REGEX:
            return None
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
