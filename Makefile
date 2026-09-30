# ClinicFlow developer commands. Run `make help` for the list.

SHELL := /bin/bash
.DEFAULT_GOAL := help

API_DIR := apps/api
WEB_DIR := apps/web

# Load .env (if present) and export it to every command, so the web app sees
# API_URL and the API sees DATABASE_URL without per-app .env files.
-include .env
export

.PHONY: help setup up down logs ps dev dev-api dev-web migrate migration \
        test test-api test-web lint fmt clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(firstword $(MAKEFILE_LIST)) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

setup: ## Install all dependencies and create .env from the example
	@test -f .env || (cp .env.example .env && echo "Created .env from .env.example")
	cd $(API_DIR) && uv sync
	cd $(WEB_DIR) && pnpm install

# --- Infrastructure -----------------------------------------------------------

up: ## Start Postgres and n8n in Docker (waits until healthy)
	docker compose up -d --wait

down: ## Stop Docker services (data is kept in volumes)
	docker compose down

logs: ## Tail Docker service logs
	docker compose logs -f

ps: ## Show Docker service status
	docker compose ps

# --- Development --------------------------------------------------------------

dev: up ## Start infra, then run API (:8000) and web (:3000) with hot reload
	@echo "API → http://localhost:8000/docs   Web → http://localhost:3000   n8n → http://localhost:$${N8N_PORT:-5678}"
	@trap 'kill 0' INT TERM EXIT; \
		$(MAKE) --no-print-directory dev-api & \
		$(MAKE) --no-print-directory dev-web & \
		wait

dev-api: ## Run only the API with reload
	cd $(API_DIR) && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-web: ## Run only the web app
	cd $(WEB_DIR) && pnpm dev

# --- Database -----------------------------------------------------------------

migrate: ## Apply all pending migrations
	cd $(API_DIR) && uv run alembic upgrade head

migration: ## Create a migration from model changes: make migration m="add referrals"
	@test -n "$(m)" || (echo 'Usage: make migration m="describe the change"' && exit 1)
	cd $(API_DIR) && uv run alembic revision --autogenerate -m "$(m)"

# --- Quality ------------------------------------------------------------------

test: test-api test-web ## Run all tests and checks

test-api: ## API: lint, format check, pytest
	cd $(API_DIR) && uv run ruff check . && uv run ruff format --check . && uv run pytest

test-web: ## Web: lint and typecheck
	cd $(WEB_DIR) && pnpm lint && pnpm typecheck

lint: ## Lint both apps
	cd $(API_DIR) && uv run ruff check .
	cd $(WEB_DIR) && pnpm lint

fmt: ## Auto-format and auto-fix
	cd $(API_DIR) && uv run ruff check --fix . && uv run ruff format .
	cd $(WEB_DIR) && pnpm lint --fix

clean: ## Stop services AND delete their data volumes (destructive)
	docker compose down -v
