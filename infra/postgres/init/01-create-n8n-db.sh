#!/usr/bin/env bash
# Runs once, on the first start of an empty Postgres volume.
# Creates a separate database for n8n's own state (workflows, credentials,
# executions) so it never mixes with ClinicFlow's application tables.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-SQL
  CREATE DATABASE "${N8N_DB_NAME:-n8n}" OWNER "$POSTGRES_USER";
SQL
