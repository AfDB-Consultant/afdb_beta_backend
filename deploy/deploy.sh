#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  AfDB Platform — Quick Redeploy Script
# ═══════════════════════════════════════════════════════════════
#  Run this after pushing code updates to GitHub.
#  Usage: ./deploy.sh [service]
#  Examples:
#    ./deploy.sh              # Redeploy everything
#    ./deploy.sh beta-backend # Redeploy only beta backend
#    ./deploy.sh beta-frontend # Redeploy only beta frontend
# ═══════════════════════════════════════════════════════════════

set -e

DEPLOY_DIR="$HOME/afdb-platform"
SERVICE="${1:-all}"

cd "$DEPLOY_DIR"

# Pull latest code
echo "Pulling latest code..."
for dir in afdb_beta_backend afdb_beta_frontend afdb_core_backend afdb_core_frontend; do
    if [ -d "$dir" ]; then
        echo "  ← $dir"
        cd "$dir" && git pull --quiet && cd ..
    fi
done

cd "$DEPLOY_DIR/afdb_beta_backend/deploy"

# Rebuild
if [ "$SERVICE" = "all" ]; then
    echo "Rebuilding all services..."
    docker compose up -d --build
else
    echo "Rebuilding $SERVICE..."
    docker compose up -d --build "$SERVICE"
fi

# Show status
echo ""
echo "Service status:"
docker compose ps

echo ""
echo "Done! Check logs: docker compose logs -f $SERVICE"
