---
title: Brand Complaint Radar
emoji: 📡
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# BrandPulse

**Real-time brand sentiment & complaint monitoring for small and medium businesses.**

BrandPulse collects public mentions about your brand, works out how people feel, separates
real complaints from background noise, groups duplicate complaints into incident threads,
scores how urgent each thread is, and alerts you when something is about to blow up.

It is a deliberately small MVP: a single FastAPI backend, a single SQLite database, and a
TanStack Start frontend. No Kafka, no Redis, no Kubernetes — just two services you can run
on a laptop.

---

## What it does

```
mention (CSV / manual paste / RSS)
        │
        ▼
  analyzer  ──►  sentiment (strongly_negative … positive)
        │        is_complaint (negative + an actionable signal)
        │        topic (Billing/Payment, Product Quality, …)
        ▼
  clustering  ──►  group near-duplicate complaints into an IncidentThread
        │
        ▼
  scoring  ──►  priority 0..1  =  0.5·severity + 0.3·reach + 0.2·velocity
        │
        ▼
  spikes + alerts  ──►  in-app alert (+ optional email / webhook)
```

**Key ideas**

- **Complaint vs. noise.** A mention is only a complaint when it is negative *and* contains
  an actionable signal (money, refund, broken, never delivered, …). "Nice place, slow today"
  is negative but not a complaint.
- **Multilingual by default.** The default rule-based analyzer understands English,
  Azerbaijani and Russian with zero model downloads.
- **Explainable priority.** Every thread stores its score breakdown
  (`severity`, `reach`, `velocity`) so you can see *why* it is urgent.
- **Priority tiers.** `Low < 0.25`, `Medium < 0.5`, `High < 0.75`, `Critical ≥ 0.75`.
  `High` and `Critical` produce alerts.

---

## Quick start

### Option A — Docker (one command)

```bash
cp .env.example .env      # optional; sane defaults are built in
docker compose up --build
```

- Frontend: <http://localhost:8080>
- API docs: <http://localhost:8000/docs>

The SQLite database is kept in the `brandpulse-data` volume.

### Option B — two commands (no Docker)

Requires **Python 3.11+** and **Node 20+**.

**1. Backend** (from `backend/`):

```bash
python -m venv .venv
.venv\Scripts\activate            # Windows;  source .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**2. Frontend** (from `frontend/`):

```bash
npm install
npm run dev                       # http://localhost:8080
```

Open <http://localhost:8080>, register a business, and click **Load demo data** on the
onboarding screen (or `POST /api/v1/demo/seed`) to fill the dashboard instantly.

---

## Project layout

```
backend/
  app/
    api/          # /api/v1 routers (auth, mentions, threads, alerts, analytics, …)
    analyzers/    # base.py (interface), rules.py (default), hf.py (optional)
    connectors/   # base.py (interface), rss.py (the one real connector)
    services/     # pipeline, clustering, scoring, spikes, alerts, scheduler, ingest
    models/       # SQLAlchemy entities
    schemas/      # Pydantic models
    seed/         # deterministic demo generator
  tests/          # pytest suite
frontend/
  src/
    routes/       # file-based TanStack Router pages
    components/   # AppShell + shadcn/ui
    lib/          # api client, auth provider, formatters
docker-compose.yml
```

**Data model:** `Business`, `User`, `Keyword`, `Source`, `Mention`, `IncidentThread`, `Alert`
— every row is scoped by `business_id`.

---

## Configuration

All settings come from environment variables (see [.env.example](file:///c:/Users/Rasul%20Gurbanli/Downloads/www-45ever-main/.env.example)).
Everything has a working default, so nothing is required for local development.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite:///./brandpulse.db` | Point at Postgres to switch databases |
| `JWT_SECRET` | `dev-secret-change-me` | **Change this outside local dev** |
| `CORS_ORIGINS` | `localhost:8080,127.0.0.1:8080,…` | Comma-separated allowed browser origins |
| `CORS_ORIGIN_REGEX` | `http://(localhost\|127\.0\.0\.1)(:\d+)?` | Dev only: any localhost port. Empty it in production |
| `ANALYZER` | `rules` | `rules` (default) or `hf` (optional model) |
| `ENABLE_SCHEDULER` | `true` | Background pipeline job |
| `PIPELINE_INTERVAL_MINUTES` | `15` | How often the scheduler syncs + runs the pipeline |
| `CLUSTERING_THRESHOLD` | `0.62` | TF-IDF cosine similarity needed to join a thread |
| `SPIKE_MULTIPLIER` | `2.0` | Flag a topic when 24h volume > 2× the 7-day average |
| `SMTP_*`, `LLM_API_KEY` | empty | Optional alert email / LLM summary |

**Frontend:** the API base URL comes from `VITE_API_URL` (default `http://127.0.0.1:8001/api/v1`).
Copy `frontend/.env.example` to `frontend/.env` to point the app at a different backend.

---

## API overview

Interactive docs at `/docs`; everything is under `/api/v1`.

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login` |
| Analyze | `POST /analyze` |
| Mentions | `POST /mentions/manual`, `POST /mentions/upload-csv`, `GET /mentions` |
| Keywords | `GET/POST /keywords`, `DELETE /keywords/{id}` |
| Sources | `GET/POST /sources`, `PATCH/DELETE /sources/{id}`, `POST /sources/{id}/sync` |
| Threads | `GET /threads`, `GET /threads/{id}`, `PATCH /threads/{id}` |
| Alerts | `GET /alerts`, `POST /alerts/{id}/ack` |
| Analytics | `GET /analytics/summary`, `/sentiment-trend`, `/topics`, `/spikes` |
| Demo | `POST /demo/seed` |

---

## Data sources

Ingestion is intentionally ToS-safe. There is **no scraping of X / Instagram / Facebook**.

- **CSV upload** and **manual paste** — always available.
- **Demo seed** — deterministic ~300 mentions in EN/AZ/RU for the dashboard.
- **RSS/Atom** — the one real connector (`Source.type = "rss"`), via `feedparser`.
  Add feed URLs in **Settings → Sources**, or `POST /sources`, then **Sync now**.
  Connectors implement a small interface (`connectors/base.py`), so a new one is a single class.

---

## How to test the AI

The analysis is deliberately transparent, so you can verify it three ways.

### 1. Playground (no setup)

Open **Analyze Playground** in the app (or `POST /api/v1/analyze`) and paste text. You get
`sentiment_label`, `sentiment_score`, `is_complaint`, `topic` and `language` back. Try:

| Text | What you should see |
| --- | --- |
| `Great coffee and very friendly staff, thank you!` | `positive`, not a complaint |
| `My card was charged twice and still no refund` | `negative`, **complaint**, topic `Billing/Payment` |
| `Meh, not impressed` | `negative`, **not** a complaint (no actionable signal) |
| `Мне дважды списали деньги и не вернули` (RU) | `negative`, complaint, `Billing/Payment` |
| `Kartımdan iki dəfə pul çıxarıldı, geri qaytarılmadı` (AZ) | `negative`, complaint, `Billing/Payment` |
| `The site was slow today` | `negative`, not a complaint, topic `Website/App Bug` |

### 2. Daily activity in the dashboard

1. **Load demo data** — the generator injects two viral complaint clusters and one fresh
   spike in EN/AZ/RU.
2. Open **Threads** — near-duplicate complaints are merged; each has a live priority score
   and tier. Open a thread to read its mentions and score breakdown.
3. Open **Alerts** — `High`/`Critical` threads raise alerts automatically.
4. Open the **Dashboard** — sentiment trend, top topics and detected spikes.

### 3. Automated tests

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

The suite covers the analyzers (EN/AZ/RU complaint detection, negations, sarcasm, typos, implicit complaints, topics,
language), priority tiers and weights, TF-IDF clustering and idempotency, the RSS connector,
CSV upload (including malformed cells) and API smoke tests.

> **Note:** the default analyzer (`ANALYZER=rules`) needs **no downloads** and now includes
> typo tolerance and sarcasm detection. The optional Hugging Face analyzer is a separate install:
> `pip install -r requirements-hf.txt` and set `ANALYZER=hf` (falls back to rules if the
> model is unavailable or fails).

---

## Tech stack

- **Backend:** Python 3.11+, FastAPI, SQLAlchemy 2, Pydantic v2, APScheduler, scikit-learn.
- **Frontend:** TanStack Start, React 19, TanStack Query, Tailwind CSS v4, shadcn/ui, Recharts.
