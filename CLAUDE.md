# ClinicFlow — notes for Claude

AI back office for small clinics (referral intake, LLM extraction, benefits
verification, voice agent). Portfolio project. Currently a skeleton only.

## Layout
- `apps/api` — FastAPI, Python 3.12, managed with **uv**. SQLAlchemy 2.x (sync, psycopg 3 driver), Alembic, pydantic-settings.
- `apps/web` — Next.js 16 App Router, TypeScript, Tailwind v4, managed with **pnpm**. Read `apps/web/AGENTS.md` before editing: Next 16 APIs differ from older versions; docs are in `apps/web/node_modules/next/dist/docs/`.
- `infra/` — Postgres init scripts. `docker-compose.yml` runs only Postgres (pgvector) and n8n; the apps run on the host.

## Commands (run from repo root)
- `make setup` · `make up` · `make dev` · `make migrate` · `make test` · `make fmt`
- New migration: `make migration m="describe change"` — then review the generated file.
- API only: `cd apps/api && uv run pytest` (set `RUN_DB_TESTS=1` with Postgres up to include DB tests).
- Web only: `cd apps/web && pnpm lint && pnpm typecheck`.

## Conventions
- Config comes only from env vars / the repo-root `.env` via `app/core/config.py`. Add new settings there and to `.env.example`.
- API routes go in `app/api/routes/<name>.py` with an `APIRouter`, registered in `app/main.py`. Use Pydantic response models.
- DB access through the `get_db` dependency; tests override it via `app.dependency_overrides`.
- ORM models go in `app/models/` and must be imported in `app/models/__init__.py` so Alembic autogenerate sees them.
- Web talks to the API from **server** code via `src/lib/api.ts` (`API_URL`), not from the browser.
- Keep `make test` green before committing; CI runs the same checks plus migrations up/down/up and `next build`.
- Python: ruff (line length 100). TS: ESLint (next config).
