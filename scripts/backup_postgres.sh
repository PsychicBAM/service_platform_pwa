#!/usr/bin/env bash
# PostgreSQL backup helper — run on VPS or Linux host with Docker Compose only.
# Does not print database passwords or env secret values.
# Backup output must stay outside the git repo (default: /opt/service-platform/backups/postgres).

set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
PROJECT_NAME="service_platform_prod"
ENV_FILE=""
BACKUP_DIR="/opt/service-platform/backups/postgres"
SERVICE="postgres"
POSTGRES_USER="service_platform"
POSTGRES_DB="service_platform"

usage() {
  cat <<'EOF'
Usage: backup_postgres.sh [options]

Create a gzip-compressed pg_dump via Docker Compose. VPS/bash only.

Options:
  --env-file PATH       Env file for POSTGRES_USER / POSTGRES_DB (optional)
  --compose-file PATH   Compose file (default: docker-compose.prod.yml)
  --project-name NAME   Compose project name (default: service_platform_prod)
  --backup-dir PATH     Output directory (default: /opt/service-platform/backups/postgres)
  --service NAME        Postgres service name (default: postgres)
  -h, --help            Show this help

Passwords are read inside the postgres container — never printed by this script.
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
    --backup-dir)
      BACKUP_DIR="${2:-}"
      shift 2
      ;;
    --service)
      SERVICE="${2:-}"
      shift 2
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

if [[ -n "$ENV_FILE" ]]; then
  POSTGRES_USER="$(read_env_var POSTGRES_USER "$ENV_FILE" "service_platform")"
  POSTGRES_DB="$(read_env_var POSTGRES_DB "$ENV_FILE" "service_platform")"
fi

if [[ "$BACKUP_DIR" == *"/repo/"* ]] || [[ "$BACKUP_DIR" == "./backups" ]]; then
  echo "WARN: backup_dir_inside_or_near_repo — prefer /opt/service-platform/backups/postgres on VPS"
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR" 2>/dev/null || true

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTFILE="${BACKUP_DIR}/service_platform_prod_${TIMESTAMP}.sql.gz"

echo "STATUS: backup_starting"

COMPOSE_ARGS=(docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE")
if [[ -n "$ENV_FILE" ]]; then
  COMPOSE_ARGS+=(--env-file "$ENV_FILE")
fi

if ! "${COMPOSE_ARGS[@]}" exec -T "$SERVICE" pg_dump \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --no-owner \
  --no-acl \
  | gzip > "$OUTFILE"; then
  echo "FAIL: pg_dump_failed"
  rm -f "$OUTFILE"
  exit 1
fi

if [[ ! -s "$OUTFILE" ]]; then
  echo "FAIL: backup_file_empty"
  rm -f "$OUTFILE"
  exit 1
fi

echo "OK: backup_file_created"
echo "PATH: $OUTFILE"
