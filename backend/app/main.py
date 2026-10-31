"""BrandPulse FastAPI application entrypoint."""

from __future__ import annotations

import logging
import os
import threading
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy import text

from .api import alerts as alerts_api
from .api import analytics as analytics_api
from .api import analyze as analyze_api
from .api import auth as auth_api
from .api import demo as demo_api
from .api import keywords as keywords_api
from .api import mentions as mentions_api
from .api import sources as sources_api
from .api import threads as threads_api
from .config import get_settings
from .db import SessionLocal, engine, init_db
from .services.scheduler import shutdown_scheduler, start_scheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

API_PREFIX = "/api/v1"
APP_VERSION = "0.1.0"


def _seed_demo_data() -> None:
    """Create the demo business + mentions when the database is empty."""
    from .seed.startup import seed_demo_if_empty

    with SessionLocal() as db:
        seed_demo_if_empty(db)


def _safe_seed_demo_data() -> None:
    """Background wrapper: a failed seed must never stop the API from serving."""
    try:
        _seed_demo_data()
    except Exception:  # noqa: BLE001 - log and keep going
        logger.exception("Demo auto-seed failed; continuing with an empty database.")


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    init_db()
    logger.info(
        "BrandPulse v%s starting — environment=%s analyzer=%s port=%s "
        "database=%s frontend_dir=%s auto_seed=%s scheduler=%s",
        APP_VERSION,
        settings.environment,
        settings.analyzer,
        os.environ.get("PORT", "(uvicorn default)"),
        settings.database_url,
        settings.frontend_dir or "(api only)",
        settings.auto_seed,
        settings.enable_scheduler,
    )
    if settings.auto_seed:
        # Background thread: a slow first-run analysis (rule or HF model) must not
        # delay the port opening or the platform's health check.
        threading.Thread(target=_safe_seed_demo_data, name="demo-seed", daemon=True).start()
    start_scheduler()
    try:
        yield
    finally:
        shutdown_scheduler()


def _mount_frontend(app: FastAPI, directory: str) -> None:
    """Serve an already-built SPA from the same origin as the API.

    Registered last so the API routes, ``/health`` and the docs take precedence. Any
    path under the build directory is served as-is; anything else falls back to
    ``index.html`` so client-side routes (e.g. ``/dashboard``) deep-link correctly.
    """
    dist = Path(directory).expanduser().resolve()
    index = dist / "index.html"
    if not index.is_file():
        logger.warning("FRONTEND_DIR=%s has no index.html; serving the API only.", dist)
        return

    @app.get("/{spa_path:path}", include_in_schema=False)
    def serve_spa(spa_path: str) -> FileResponse:
        if spa_path == "api" or spa_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        candidate = (dist / spa_path).resolve()
        if spa_path and candidate.is_file() and candidate.is_relative_to(dist):
            return FileResponse(candidate)
        return FileResponse(index)

    logger.info("Serving the built frontend from %s", dist)


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=f"{settings.app_name} API",
        version=APP_VERSION,
        description="Real-time brand sentiment & complaint monitoring for small and medium businesses.",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_origin_regex=settings.effective_cors_origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth_api.router, prefix=API_PREFIX)
    app.include_router(analyze_api.router, prefix=API_PREFIX)
    app.include_router(mentions_api.router, prefix=API_PREFIX)
    app.include_router(demo_api.router, prefix=API_PREFIX)
    app.include_router(threads_api.router, prefix=API_PREFIX)
    app.include_router(alerts_api.router, prefix=API_PREFIX)
    app.include_router(analytics_api.router, prefix=API_PREFIX)
    app.include_router(keywords_api.router, prefix=API_PREFIX)
    app.include_router(sources_api.router, prefix=API_PREFIX)

    @app.get("/health", tags=["meta"])
    def health(response: Response) -> dict[str, str]:
        """Liveness + readiness: reports 503 when the database is unreachable."""
        payload = {
            "status": "ok",
            "app": settings.app_name,
            "environment": settings.environment,
            "analyzer": settings.analyzer,
            "database": "ok",
        }
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
        except Exception:
            logger.exception("Health check: the database is not reachable.")
            payload["status"] = "error"
            payload["database"] = "unreachable"
            response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return payload

    if settings.frontend_dir:
        _mount_frontend(app, settings.frontend_dir)

    return app


app = create_app()
