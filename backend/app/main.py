"""BrandPulse FastAPI application entrypoint."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
from .db import init_db
from .services.scheduler import shutdown_scheduler, start_scheduler

logging.basicConfig(level=logging.INFO)

API_PREFIX = "/api/v1"


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    init_db()
    start_scheduler()
    try:
        yield
    finally:
        shutdown_scheduler()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=f"{settings.app_name} API",
        version="0.1.0",
        description="Real-time brand sentiment & complaint monitoring for small and medium businesses.",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_origin_regex=settings.cors_origin_regex or None,
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
    def health() -> dict[str, str]:
        return {"status": "ok", "app": settings.app_name}

    return app


app = create_app()
