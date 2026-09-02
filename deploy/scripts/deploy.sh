#!/bin/bash
# ==============================================================================
# AEROSTAKE — PRODUCTION DEPLOYMENT SCRIPT (VPS)
# ==============================================================================
set -e

echo "🚀 Starting Aerostake Zero-Downtime Production Deployment..."

# 1. Ensure .env.prod exists
if [ ! -f .env.prod ]; then
    echo "❌ Error: .env.prod not found! Please create .env.prod with production secrets."
    exit 1
fi

# 2. Pull latest code from main
echo "📥 Pulling latest release from git..."
git pull origin main

# 3. Build & start containers
echo "📦 Building and starting production containers..."
docker compose -f docker-compose.prod.yml up -d --build

# 4. Run database migrations inside backend container
echo "🔄 Running Alembic database migrations..."
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head

# 5. Healthcheck status
echo "🔍 Verifying services status..."
docker compose -f docker-compose.prod.yml ps

echo "✨ Production deployment completed successfully!"
