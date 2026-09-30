# ClinicFlow

An AI back office for small outpatient clinics: referral intake, LLM-based
document extraction, insurance benefits verification, and voice agents that
call payers and patients.

> **Status:** skeleton only. The stack is wired end to end (web → API →
> Postgres, plus n8n), but no business features exist yet. See the
> [roadmap](#roadmap).

## Architecture

```
                 ┌──────────────────────┐
  browser ──────▶│  apps/web  (Next.js) │  :3000
                 └──────────┬───────────┘
                            │ server-side fetch (API_URL)
                 ┌──────────▼───────────┐
                 │  apps/api (FastAPI)  │  :8000   ◀──── n8n calls the API
                 └──────────┬───────────┘               via webhooks/HTTP
                            │ SQLAlchemy + psycopg 3
┌───────────────────────────▼────────────────────────────┐
│  Postgres 17 + pgvector   (docker)                :5432│
│   ├─ db "clinicflow"  → app tables (Alembic)           │
│   └─ db "n8n"         → n8n's own state                │
└────────────────────────────────────────────────────────┘
                 ┌──────────────────────┐
                 │  n8n  (docker)       │  :5678   workflow automation
                 └──────────────────────┘
```

| Piece | Why it's here |
|---|---|
| **Next.js (App Router)** | UI for clinic staff. Server Components call the API directly, so the browser never needs API credentials. |
| **FastAPI** | Typed Python API. Python has the best LLM, document and data tooling. Auto-generated OpenAPI docs at `/docs`. |
| **SQLAlchemy + Alembic** | ORM and versioned schema migrations. Every schema change is a reviewed, reversible file. |
| **pydantic-settings** | One typed config object loaded from env vars / `.env`. Misconfiguration fails at startup, not mid-request. |
| **Postgres + pgvector** | One database for relational data *and* embeddings (semantic search over referrals and policies). |
| **n8n** | Visual workflow automation for the glue: fax/email ingestion, EHR sync, retries, scheduled jobs. |

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with Compose v2
- [uv](https://docs.astral.sh/uv/getting-started/installation/) (installs Python 3.12 for you if needed)
- Node.js 20+ and [pnpm](https://pnpm.io/installation) (`corepack enable pnpm`)
- `make`

## Quickstart

```bash
make setup      # installs deps, creates .env from .env.example
# edit .env and set N8N_ENCRYPTION_KEY (openssl rand -hex 32)
make dev        # starts Postgres + n8n, then API and web with hot reload
make migrate    # in another terminal: apply DB migrations
```

Then open:

| URL | What |
|---|---|
| http://localhost:3000/status | Web page showing the API's live health |
| http://localhost:8000/health | Raw health check (JSON) |
| http://localhost:8000/docs | Interactive API docs (Swagger UI) |
| http://localhost:5678 | n8n (create the owner account on first visit) |

Press `Ctrl+C` to stop the API and web. `make down` stops the containers.

## Commands

Run `make help` for the full list.

| Command | What it does |
|---|---|
| `make setup` | Install Python and Node deps, create `.env` |
| `make up` / `make down` | Start or stop Postgres and n8n |
| `make dev` | `up`, then run API (:8000) and web (:3000) together |
| `make dev-api` / `make dev-web` | Run just one app |
| `make migrate` | Apply pending migrations (`alembic upgrade head`) |
| `make migration m="add referrals"` | Autogenerate a migration from model changes |
| `make test` | API: ruff + pytest. Web: ESLint + TypeScript |
| `make fmt` | Auto-format and auto-fix both apps |
| `make logs` / `make ps` | Inspect Docker services |
| `make clean` | Stop services **and delete their data** |

## Health check

`GET /health` is a *readiness* check. It runs `SELECT 1` against Postgres:

```json
// 200 OK
{ "status": "ok", "version": "0.1.0", "environment": "local", "database": "ok" }

// 503 Service Unavailable (Postgres down)
{ "status": "degraded", "version": "0.1.0", "environment": "local", "database": "error" }
```

The web page at `/status` renders every request (no caching) and handles three
states: healthy, API up but database down, and API unreachable.

## Configuration

All config lives in the repo-root `.env` (copied from `.env.example`):

- `docker compose` reads it automatically.
- The API loads it via pydantic-settings (`apps/api/app/core/config.py`).
- The `Makefile` exports it, so `make dev-web` passes `API_URL` to Next.js.

Real environment variables override `.env`, which is how CI and production
configure the apps.

## Project layout

```
apps/
  api/                    FastAPI service (uv)
    app/
      main.py             app factory, CORS, routers
      core/config.py      settings
      db/                 engine, session, declarative Base
      api/routes/         one module per route group
      models/             ORM models (empty for now)
    alembic/versions/     migrations (0001 enables pgvector)
    tests/
  web/                    Next.js app (pnpm)
    src/app/              routes: / and /status
    src/lib/api.ts        server-side API client
infra/postgres/init/      runs on first DB start (creates the n8n database)
docker-compose.yml        Postgres (pgvector) + n8n
.github/workflows/ci.yml  lint, typecheck, migrations, tests, build
```

## Testing

```bash
make test                                        # everything
cd apps/api && uv run pytest                     # API unit tests (no DB needed)
cd apps/api && RUN_DB_TESTS=1 uv run pytest      # include tests against real Postgres
```

CI (GitHub Actions) runs on every push and PR. It lints both apps, applies
migrations up → down → up against a real pgvector Postgres, runs pytest with DB
tests enabled, type-checks and builds the web app, and validates
`docker-compose.yml`.

## Troubleshooting

- **Port already in use** — change `POSTGRES_PORT` or `N8N_PORT` in `.env`, and update `DATABASE_URL` to match.
- **`/status` shows "API unreachable"** — the API isn't running. Try `make dev-api` and check its output.
- **n8n database missing** — the init script only runs on an empty volume. Run `make clean && make up` to recreate it (this deletes local data).
- **n8n "credentials could not be decrypted"** — `N8N_ENCRYPTION_KEY` changed after credentials were saved. Restore the old key.

## Roadmap

1. **Referral intake** — upload PDFs and fax images, store them, trigger an n8n workflow.
2. **LLM extraction** — structured outputs (patient, insurance, diagnosis codes) with a versioned prompt library and an eval set.
3. **Prompt A/B testing** — assign prompt versions per request, log outcomes, compare accuracy.
4. **Benefits verification** — mock payer API, n8n orchestration, retries for messy real-world data.
5. **Voice agent** — speech-to-text → LLM → text-to-speech agent that places a simulated payer call.
