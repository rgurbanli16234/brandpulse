# syntax=docker/dockerfile:1
# BrandPulse — single-container deploy (API + built SPA) for Hugging Face Spaces.
#
#   docker build -t brandpulse .
#   docker run -p 7860:7860 brandpulse
#
# The FastAPI app serves the API under /api/v1 and the built frontend at "/".

# ---------------------------------------------------------------------------
# Stage 1 — build the frontend into a static SPA (index.html + /assets)
# ---------------------------------------------------------------------------
FROM node:22-slim AS frontend

WORKDIR /fe

# Dependencies first so this layer is cached across source-only changes.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

# NITRO_PRESET is deliberately NOT set: TanStack Start's prerender step needs the
# default cloudflare-module preset (a `fetch` bundle) to emit a static
# .output/public/index.html. The node-server preset exports a Node handler and
# makes prerendering fail.
ENV NODE_ENV=production
RUN npm run build


# ---------------------------------------------------------------------------
# Stage 2 — FastAPI + uvicorn serving the API and the built SPA on port 7860
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    # Production mode: the app refuses to start unless JWT_SECRET is a long, non-default
    # value supplied as a Space secret.
    ENVIRONMENT=production \
    # Writable model cache for the non-root user below.
    HF_HOME=/app/hf_cache \
    # Serve the built SPA from the same origin as the API.
    FRONTEND_DIR=/app/frontend_dist \
    DATABASE_URL=sqlite:////app/data/brandpulse.db \
    # "hf" uses the neural model baked in below; the code falls back to the rule
    # analyzer automatically if the model cannot be loaded. Set ANALYZER=rules in
    # the Space settings to skip it entirely.
    ANALYZER=hf \
    # The Space disk is ephemeral: re-create the demo dashboard on every cold start.
    AUTO_SEED=true \
    ENABLE_SCHEDULER=true \
    # Same-origin in production, so the localhost CORS regex is unnecessary.
    CORS_ORIGIN_REGEX= \
    PORT=7860

# Hugging Face Spaces expects the app to run as a non-root user (uid 1000).
RUN useradd -m -u 1000 user

WORKDIR /app

# CPU-only torch: the default wheel pulls ~2.5 GB of CUDA libraries we never use.
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu "torch>=2.2"

COPY backend/requirements.txt backend/requirements-hf.txt ./
RUN pip install --no-cache-dir -r requirements-hf.txt

COPY backend/app ./app

# Bake the sentiment model into the image so the first request never waits on a
# ~1 GB download. This mirrors HfAnalyzer exactly, so a broken model fails the
# build instead of silently degrading at runtime.
RUN python -c "from transformers import pipeline; p = pipeline('sentiment-analysis', model='cardiffnlp/twitter-xlm-roberta-base-sentiment', truncation=True); print('model warmup:', p('great coffee and friendly staff'))"

# Stage 1 output: the static SPA FastAPI serves at "/".
COPY --from=frontend /fe/.output/public ./frontend_dist

RUN mkdir -p /app/data && chown -R user:user /app

USER user

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:7860/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
