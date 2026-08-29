#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  AfDB Platform — AWS EC2 Deployment Script
# ═══════════════════════════════════════════════════════════════
#  Run this ONCE on a fresh EC2 Ubuntu instance to set up everything.
#  Then use deploy.sh for subsequent deployments.
# ═══════════════════════════════════════════════════════════════

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ── 1. System Update ─────────────────────────────────────────
log "Updating system packages..."
sudo apt-get update -qq && sudo apt-get upgrade -y -qq

# ── 2. Install Docker ────────────────────────────────────────
if ! command -v docker &> /dev/null; then
    log "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    log "Docker installed. You may need to log out and back in for group changes."
else
    log "Docker already installed: $(docker --version)"
fi

# ── 3. Install Docker Compose ────────────────────────────────
if ! command -v docker compose &> /dev/null; then
    log "Installing Docker Compose plugin..."
    sudo apt-get install -y -qq docker-compose-plugin
else
    log "Docker Compose already available"
fi

# ── 4. Install Git ───────────────────────────────────────────
if ! command -v git &> /dev/null; then
    log "Installing Git..."
    sudo apt-get install -y -qq git
fi

# ── 5. Clone Repositories ────────────────────────────────────
DEPLOY_DIR="$HOME/afdb-platform"
mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

REPOS=(
    "https://github.com/YOUR_GITHUB/afdb_beta_backend.git"
    "https://github.com/YOUR_GITHUB/afdb_beta_frontend.git"
    "https://github.com/YOUR_GITHUB/afdb_core_backend.git"
    "https://github.com/YOUR_GITHUB/afdb_core_frontend.git"
)

for repo in "${REPOS[@]}"; do
    repo_name=$(basename "$repo" .git)
    if [ -d "$repo_name" ]; then
        log "Pulling latest for $repo_name..."
        cd "$repo_name" && git pull && cd ..
    else
        log "Cloning $repo_name..."
        git clone "$repo"
    fi
done

# ── 6. Setup Environment ─────────────────────────────────────
cd "$DEPLOY_DIR/afdb_beta_backend/deploy"

if [ ! -f .env ]; then
    log "Creating .env from template..."
    cp .env.production .env
    warn "IMPORTANT: Edit .env with your actual values before continuing!"
    warn "  nano .env"
    exit 0
else
    log ".env file already exists"
fi

# ── 7. Replace Domain in Nginx Config ────────────────────────
source .env
if [ -n "$DOMAIN" ] && [ "$DOMAIN" != "your-domain.com" ]; then
    log "Configuring Nginx for domain: $DOMAIN"
    sed -i "s/YOUR_DOMAIN/$DOMAIN/g" nginx/conf.d/default.conf
fi

# ── 8. Build and Start ───────────────────────────────────────
log "Building and starting all services..."
docker compose up -d --build

# ── 9. Setup SSL (after DNS is pointing to this server) ──────
# Uncomment the following lines AFTER your domain DNS is configured:
#
# log "Obtaining SSL certificate..."
# docker compose run certbot certbot --email admin@$DOMAIN \
#     --agree-tos --no-eff-email --webroot \
#     -w /var/www/certbot -d $DOMAIN -d www.$DOMAIN
#
# log "Reloading Nginx with SSL..."
# docker compose restart nginx

log "═══════════════════════════════════════════════════════"
log "  Deployment complete!"
log "═══════════════════════════════════════════════════════"
log ""
log "  Services:"
log "    Beta Frontend:  http://$(curl -s ifconfig.me):3000"
log "    Core Frontend:  http://$(curl -s ifconfig.me):3001"
log "    Beta Backend:   http://$(curl -s ifconfig.me):4000"
log "    Core Backend:   http://$(curl -s ifconfig.me):4001"
log ""
log "  After DNS + SSL setup:"
log "    Auth Portal:    https://$DOMAIN"
log "    Dashboard:      https://$DOMAIN/app/"
log "    API Docs:       https://$DOMAIN/api-docs/"
log ""
warn "Next steps:"
warn "  1. Edit .env: nano $DEPLOY_DIR/afdb_beta_backend/deploy/.env"
warn "  2. Point DNS A record to: $(curl -s ifconfig.me)"
warn "  3. Run SSL setup (see comments in this script)"
warn "  4. Rebuild: docker compose up -d --build"
