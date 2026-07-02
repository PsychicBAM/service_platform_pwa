#!/usr/bin/env bash
# PostgreSQL restore helper — run on VPS or Linux host with Docker Compose only.
# DESTRUCTIVE: overwrites data in the target database.
# Stop api/web before restore. Does not print database passwords.

set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
PROJECT_NAME="service_platform_prod"
ENV_FILE=""
BACKUP_FILE=""
SERVICE="postgres"
POSTGRES_USER="service_platform"
POSTGRES_DB="service_platform"
STOP_WRITERS=0

usage() {
  cat <<'EOF'
Usage: restore_postgres.sh --backup-file PATH [options]

Restore a .sql.gz dump into Postgres via Docker Compose. VPS/bash only.

Required:
  --backup-file PATH    Gzip-compressed SQL dump to restore

Options:
  --env-file PATH       Env file for POSTGRES_USER / POSTGRES_DB (optional)
  --compose-file PATH   Compose file (default: docker-compose.prod.yml)
  --project-name NAME   Compose project name (default: service_platform_prod)
  --service NAME        Postgres service name (default: postgres)
  --stop-writers        Stop api and web before restore (recommended)
  -h, --help            Show this help

Warnings:
  - Backup current database before restore.
  - Restore is destructive. Use a maintenance window on production.
  - Passwords are handled inside the postgres container — never printed here.
EOF
}

read_env_var() {
  local key="$1"
  local file="$2"
  local default="${3:-}"
  local line value

  if [[ ! -f "$file" ]]; then
    printf '%s' "$default"
    return 0
  fi

  line=$(grep -E "^[[:space:]]*${key}=" "$file" | tail -n 1 || true)
  if [[ -z "$line" ]]; then
    printf '%s' "$default"
    return 0
  fi

  value="${line#*=}"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  if [[ "${value:0:1}" == '"' && "${value: -1}" == '"' ]]; then
    value="${value:1:${#value}-2}"
  elif [[ "${value:0:1}" == "'" && "${value: -1}" == "'" ]]; then
    value="${value:1:${#value}-2}"
  fi
  printf '%s' "${value:-$default}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="${2:-}"
      shift 2
      ;;
    --compose-file)
      COMPOSE_FILE="${2:-}"
      shift 2
      ;;
    --project-name)
      PROJECT_NAME="${2:-}"
      shift 2
      ;;
    --backup-file)
      BACKUP_FILE="${2:-}"
      shift 2
      ;;
    --service)
      SERVICE="${2:-}"
      shift 2
      ;;
    --stop-writers)
      STOP_WRITERS=1
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "FAIL: unknown_argument"
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$BACKUP_FILE" ]]; then
  echo "FAIL: backup_file_required"
  usage >&2
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "FAIL: backup_file_not_found"
  exit 1
fi

if [[ ! -s "$BACKUP_FILE" ]]; then
  echo "FAIL: backup_file_empty"
  exit 1
fi

if [[ -n "$ENV_FILE" ]]; then
  POSTGRES_USER="$(read_env_var POSTGRES_USER "$ENV_FILE" "service_platform")"
  POSTGRES_DB="$(read_env_var POSTGRES_DB "$ENV_FILE" "service_platform")"
fi

COMPOSE_ARGS=(docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE")
if [[ -n "$ENV_FILE" ]]; then
  COMPOSE_ARGS+=(--env-file "$ENV_FILE")
fi

echo "WARN: restore_is_destructive"
echo "STATUS: restore_starting"

if [[ "$STOP_WRITERS" -eq 1 ]]; then
  echo "STATUS: stopping_api_and_web"
  "${COMPOSE_ARGS[@]}" stop api web || true
fi

if ! gunzip -c "$BACKUP_FILE" | "${COMPOSE_ARGS[@]}" exec -T "$SERVICE" psql \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB"; then
  echo "FAIL: restore_failed"
  exit 1
fi

echo "OK: restore_completed"
echo "NEXT: start api/web, run alembic upgrade head, run health smoke tests"
