"""Application settings, loaded from environment variables (and a .env file)."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "../.env"), extra="ignore")

    app_name: str = "BrandPulse"

    # Single database; swap to Postgres by setting DATABASE_URL.
    database_url: str = "sqlite:///./brandpulse.db"

    # Auth
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days

    # CORS (comma-separated origins). Includes the Vite dev server on 8080.
    cors_origins: str = (
        "http://localhost:8080,http://127.0.0.1:8080,"
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
    )
    # Dev convenience: accept any localhost / 127.0.0.1 origin on any port.
    # Set CORS_ORIGIN_REGEX= (empty) in production to rely on the explicit list only.
    cors_origin_regex: str = r"http://(localhost|127\.0\.0\.1)(:\d+)?"

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
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
