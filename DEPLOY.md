# DEPLOY.md — hosting BrandPulse (Brand Complaint Radar)

One public URL, one container: the FastAPI backend serves both the JSON API under
`/api/v1` and the pre-built single-page frontend at `/`.

---

## 1. Target

| | |
|---|---|
| Platform | [Hugging Face Spaces](https://huggingface.co/spaces), SDK **docker** |
| Space | `brand-complaint-radar` |
| Public URL | `https://<username>-brand-complaint-radar.hf.space` |
| Space repo | `https://huggingface.co/spaces/<username>/brand-complaint-radar` |
| Container port | `7860` (HF's `app_port`) |
| Build | multi-stage `Dockerfile` at the repo root (`node:22-slim` → `python:3.12-slim`) |

Hugging Face was chosen over Vercel because the backend needs scikit-learn (and
optionally torch/transformers), which are far too large for serverless functions.
A Space gives ~16 GB RAM and no bundle-size limit on the free tier.

## 2. What the container does

1. **Stage 1** builds the frontend with Vite (`npm ci && npm run build`) into a
   static SPA (`frontend/.output/public/index.html` + `/assets`).
2. **Stage 2** installs the backend, bakes the sentiment model into the image, and
   copies the SPA in as `/app/frontend_dist`.
3. `uvicorn app.main:app` listens on `0.0.0.0:7860`, running as the non-root user
   `user` (uid 1000) with `HF_HOME=/app/hf_cache`.

Runtime environment baked into the image:

| Variable | Value | Why |
|---|---|---|
| `FRONTEND_DIR` | `/app/frontend_dist` | FastAPI serves the SPA at `/` |
| `DATABASE_URL` | `sqlite:////app/data/brandpulse.db` | single SQLite file (ephemeral) |
| `ANALYZER` | `hf` | neural model, auto-falls back to `rules` |
| `AUTO_SEED` | `true` | re-creates the demo dashboard on every cold start |
| `ENABLE_SCHEDULER` | `true` | pipeline runs every 15 min |
| `CORS_ORIGIN_REGEX` | *(empty)* | same origin, no cross-origin requests needed |

## 3. Which analyzer is active

**`hf`** — `cardiffnlp/twitter-xlm-roberta-base-sentiment`, downloaded **at image
build time** (never on first request) and run on CPU.

It loads cleanly, which required pinning three things in `backend/requirements-hf.txt`:

* `transformers>=4.49,<5` — transformers 5.x fails on this model's tokenizer;
* `sentencepiece` — the model repo ships no `tokenizer_config.json` / `tokenizer.json`,
  only `sentencepiece.bpe.model`, so the tokenizer must be built from it;
* `protobuf` — required for that conversion.

The model supplies the **sentiment signal only**; complaint detection, topic and
language still come from the rule analyzer, so the output shape is unchanged.

`backend/app/analyzers/__init__.py` never crashes if the model is missing: if
`HfAnalyzer()` raises, it logs a warning and returns `RuleAnalyzer()`.

**To switch to the rule analyzer** (much faster cold-start seeding, no model):
Space → Settings → Variables and secrets → add `ANALYZER` = `rules`.

## 4. Demo data

A Space's disk is ephemeral, so `backend/app/seed/startup.py` seeds on startup when
the database has no business yet: a demo business + owner, 3 keywords and ~300
EN/AZ/RU mentions, then the full pipeline (analysis → clustering → scoring → alerts).

Demo login shown on the login page:

```
email:    demo@brandpulse.app
password: demo1234
```

Seeding runs in a **background thread**, so the port opens and `/health` answers
immediately. With `ANALYZER=hf` on 2 free CPU cores the 300 mentions take a few
minutes to appear; the dashboard fills in on its own. Set `ANALYZER=rules` for an
instant dashboard.

## 5. Adding an LLM key (optional)

Alert summaries use templates by default. To use an OpenAI-generated summary:

Space → **Settings → Variables and secrets → New secret** → name `LLM_API_KEY`,
value = your key. There is no code change and no restart of your local machine; the
Space restarts itself. If the key is absent or invalid, summaries silently fall back
to the template — nothing crashes. No user text is sent anywhere unless this key is set.

## 6. Known limitations

* Free Spaces sleep after ~48 h of inactivity and cold-start in ~1 minute.
* The disk is ephemeral: the database is recreated (and re-seeded) on every restart.
* The free CPU tier is for demos, not production traffic.
* `ANALYZER=hf` cold-start seeding takes a few minutes on 2 CPU cores.
* The neural model improves sentiment, not topics: AZ/RU topic tagging stays heuristic.

## 7. Redeploy after changes

```bash
# one-time: authenticate (write token)
export HF_TOKEN=hf_xxx            # PowerShell: $env:HF_TOKEN="hf_xxx"

# after any change, from the repo root:
python -c "from huggingface_hub import HfApi; HfApi().upload_folder(folder_path='.', repo_id='<username>/brand-complaint-radar', repo_type='space', ignore_patterns=['.git*','**/node_modules/**','frontend/.output/**','frontend/.wrangler/**','backend/.venv/**','**/__pycache__/**','*.db','*.log','.env','.env.*'])"
```

The Space rebuilds automatically; watch it under the Space's **Logs** tab. A commit
pushed to the Space's own git remote does the same thing:

```bash
git push https://<username>:<token>@huggingface.co/spaces/<username>/brand-complaint-radar main
```

## 8. Run the same container locally

```bash
docker build -t brandpulse .
docker run --rm -p 7860:7860 brandpulse
# http://localhost:7860
```

Without Docker (two processes, as in development): see the "Quick start" section of
[README.md](README.md). Note that the local quick-start does **not** set
`FRONTEND_DIR`, so the Vite dev server serves the UI on :8080 and the API answers on
:8000.

## 9. Decisions taken where the brief was ambiguous

* **`python:3.12-slim`, not 3.11.** The project targets Python 3.12 and the pinned
  dependency versions (numpy 2.5, pandas 3.1, scipy 1.18, scikit-learn 1.9) are the
  ones verified in a local 3.12 environment; 3.11 risks missing wheels.
* **`node:22-slim`, not alpine.** Glibc avoids surprises with Vite 8 / rolldown
  native binaries.
* **The SPA is built with the default cloudflare-module Nitro preset.** TanStack
  Start's prerender step calls `server.fetch()`, which only exists on a fetch bundle;
  the `node-server` preset exports a Node handler and makes the build fail. We only
  need the static `public/` output, which is exactly what is copied into the image.
* **`docker-compose.yml` and `backend/Dockerfile` are unchanged.** They are the local
  development path (ports 8000/8080); the Space uses the root `Dockerfile` only.
