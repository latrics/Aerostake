#!/usr/bin/env bash
# ==============================================================================
# AEROSTAKE — PRODUCTION & STAGING DEPLOYMENT SCRIPT (VPS)
# Features:
# - Dual-stack support (prod | dev)
# - Automated pre-migration PostgreSQL backup
# - Build-before-switch & migration-before-launch ordering
# - Parameterized loopback healthcheck
# ==============================================================================
set -euo pipefail

ENV_TARGET="${1:-prod}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${ROOT_DIR}"

echo "======================================================================"
echo "🚀 Aerostake Deployment Initiated [Target: ${ENV_TARGET}]"
echo "======================================================================"

# 1. Determine environment file
if [ "${ENV_TARGET}" = "dev" ] || [ "${ENV_TARGET}" = "staging" ]; then
    ENV_FILE=".env.dev"
    if [ ! -f "${ENV_FILE}" ] && [ -f ".env" ]; then
        ENV_FILE=".env"
    fi
    DEFAULT_API_PORT=18420
    DEFAULT_PROJECT_NAME="aerostake-dev"
else
    ENV_FILE=".env.prod"
    if [ ! -f "${ENV_FILE}" ] && [ -f ".env" ]; then
        ENV_FILE=".env"
    fi
    DEFAULT_API_PORT=18410
    DEFAULT_PROJECT_NAME="aerostake-prod"
fi

if [ ! -f "${ENV_FILE}" ]; then
    echo "❌ Error: Environment file '${ENV_FILE}' not found in ${ROOT_DIR}!"
    echo "Please create '${ENV_FILE}' before running deploy."
    exit 1
fi

export ENV_FILE
export COMPOSE_FILE="docker-compose.prod.yml"

# Export variables from env file for script use
set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-${DEFAULT_PROJECT_NAME}}"
API_PORT="${API_PORT:-${DEFAULT_API_PORT}}"
export COMPOSE_PROJECT_NAME
export API_PORT

echo "ℹ️  Active Project: ${COMPOSE_PROJECT_NAME}"
echo "ℹ️  Loopback API Port: ${API_PORT}"

# 2. Automated pre-migration DB backup (if Postgres container is running)
BACKUP_DIR="${BACKUP_DIR:-/srv/backups}"
mkdir -p "${BACKUP_DIR}" 2>/dev/null || BACKUP_DIR="./backups"
mkdir -p "${BACKUP_DIR}"

if docker compose -f "${COMPOSE_FILE}" ps --status running postgres 2>/dev/null | grep -q "postgres"; then
    TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
    BACKUP_FILE="${BACKUP_DIR}/${COMPOSE_PROJECT_NAME}_pre_migration_${TIMESTAMP}.sql.gz"
    echo "💾 Creating pre-migration database snapshot: ${BACKUP_FILE}..."
    docker compose -f "${COMPOSE_FILE}" exec -T postgres pg_dump -U "${POSTGRES_USER:-aerostake_prod_user}" "${POSTGRES_DB:-aerostake_prod_db}" | gzip > "${BACKUP_FILE}"
    echo "✅ Snapshot secured successfully."
fi

# 3. Pull latest commits for active branch
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "📥 Pulling latest code from git (branch: ${CURRENT_BRANCH})..."
git pull origin "${CURRENT_BRANCH}"

# 4. Build application images
echo "📦 Building updated container images..."
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" build

# 5. Ensure dependencies are running and execute migrations
echo "🔄 Starting backing databases (Postgres & Redis)..."
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d postgres redis

echo "🔄 Running Alembic migrations..."
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" run --rm backend alembic upgrade head

# 6. Graceful zero-downtime start of service containers
echo "🚀 Starting web and API services..."
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d --remove-orphans

# 7. Automated health verification
echo "🔍 Checking API health at http://127.0.0.1:${API_PORT}/health..."
MAX_ATTEMPTS=15
ATTEMPT=1
HEALTHY=false

while [ ${ATTEMPT} -le ${MAX_ATTEMPTS} ]; do
    if curl -s -f "http://127.0.0.1:${API_PORT}/health" > /dev/null 2>&1; then
        HEALTHY=true
        break
    fi
    echo "   Attempt ${ATTEMPT}/${MAX_ATTEMPTS} — waiting for backend to respond..."
    sleep 2
    ATTEMPT=$((ATTEMPT + 1))
done

if [ "${HEALTHY}" = true ]; then
    echo "✅ Backend healthcheck passed!"
else
    echo "⚠️  Warning: Healthcheck endpoint did not respond with 200 within timeout."
    echo "Inspecting recent backend logs:"
    docker compose -f "${COMPOSE_FILE}" logs --tail 30 backend
fi

echo "✨ Deployment to ${COMPOSE_PROJECT_NAME} complete!"
docker compose -f "${COMPOSE_FILE}" ps
