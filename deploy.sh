#!/usr/bin/env bash
#
# WishList — One-command deployment helper
#
# Prerequisites:
#   - GitHub repo pushed
#   - railway CLI: npm i -g @railway/cli
#   - vercel CLI: npm i -g vercel
#   - Supabase project created (free tier) at https://supabase.com
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
#
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── Check prerequisites ──────────────────────────────────────────────
check_cmd() {
  command -v "$1" &>/dev/null || err "$1 is not installed. Install it first."
}

info "Checking prerequisites..."
check_cmd git
check_cmd railway
check_cmd vercel
check_cmd python3
ok "All CLI tools found"

# ── Generate secrets ──────────────────────────────────────────────────
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
info "Generated SECRET_KEY: ${SECRET_KEY:0:8}..."

# ── Step 1: Supabase Database URL ─────────────────────────────────────
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
echo -e "${CYAN}  STEP 1: Supabase PostgreSQL                 ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
echo ""
echo "1. Go to https://supabase.com → New Project"
echo "2. Copy the connection string from: Settings → Database → Connection string → URI"
echo "3. IMPORTANT: Replace 'postgresql://' with 'postgresql+asyncpg://'"
echo "   Also change port 5432 to 6543 if using connection pooling."
echo ""
read -rp "Paste your DATABASE_URL (postgresql+asyncpg://...): " DATABASE_URL
echo ""

if [[ -z "$DATABASE_URL" ]]; then
  err "DATABASE_URL cannot be empty"
fi

if [[ "$DATABASE_URL" != postgresql+asyncpg://* ]]; then
  warn "URL should start with postgresql+asyncpg:// — fixing prefix..."
  DATABASE_URL="postgresql+asyncpg://${DATABASE_URL#*://}"
fi

ok "Database URL set"

# ── Step 2: Deploy Backend to Railway ─────────────────────────────────
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
echo -e "${CYAN}  STEP 2: Deploy Backend → Railway             ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
echo ""

info "Logging into Railway..."
railway login 2>/dev/null || true

info "Initializing Railway project..."
cd backend

railway init --name wishlist-backend 2>/dev/null || warn "Project may already exist"

info "Setting environment variables..."
railway variables set \
  DATABASE_URL="$DATABASE_URL" \
  SECRET_KEY="$SECRET_KEY" \
  CORS_ORIGINS="PLACEHOLDER_WILL_UPDATE" \
  APP_ENV="production" \
  PORT="8000"

info "Deploying backend..."
railway up --detach

BACKEND_URL=$(railway domain 2>/dev/null || echo "")
if [[ -z "$BACKEND_URL" ]]; then
  info "Generating public domain..."
  BACKEND_URL=$(railway domain --json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('domain',''))" 2>/dev/null || echo "")
fi

if [[ -z "$BACKEND_URL" ]]; then
  echo ""
  warn "Could not auto-detect Railway URL."
  read -rp "Enter your Railway backend URL (e.g., wishlist-backend-production.up.railway.app): " BACKEND_URL
fi

BACKEND_URL="https://${BACKEND_URL#https://}"
BACKEND_URL="${BACKEND_URL%/}"

ok "Backend deployed at: $BACKEND_URL"
cd ..

# ── Step 3: Deploy Frontend to Vercel ─────────────────────────────────
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
echo -e "${CYAN}  STEP 3: Deploy Frontend → Vercel             ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
echo ""

cd frontend

info "Deploying frontend to Vercel..."
vercel --yes \
  --build-env NEXT_PUBLIC_API_URL="$BACKEND_URL" \
  -e NEXT_PUBLIC_API_URL="$BACKEND_URL" \
  --prod 2>&1 | tee /tmp/vercel_output.txt

FRONTEND_URL=$(grep -oP 'https://[^\s]+\.vercel\.app' /tmp/vercel_output.txt | head -1 || echo "")

if [[ -z "$FRONTEND_URL" ]]; then
  echo ""
  read -rp "Enter your Vercel frontend URL (e.g., https://wishlist.vercel.app): " FRONTEND_URL
fi

ok "Frontend deployed at: $FRONTEND_URL"
cd ..

# ── Step 4: Update CORS on backend ───────────────────────────────────
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
echo -e "${CYAN}  STEP 4: Configure CORS                       ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
echo ""

info "Updating backend CORS_ORIGINS to allow frontend..."
cd backend
railway variables set CORS_ORIGINS="$FRONTEND_URL"

info "Redeploying backend with updated CORS..."
railway up --detach
cd ..

ok "CORS configured: $FRONTEND_URL"

# ── Summary ───────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  DEPLOYMENT COMPLETE!                         ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo -e "  Frontend:   ${CYAN}${FRONTEND_URL}${NC}"
echo -e "  Backend:    ${CYAN}${BACKEND_URL}${NC}"
echo -e "  API Health: ${CYAN}${BACKEND_URL}/api/health${NC}"
echo -e "  WebSocket:  ${CYAN}${BACKEND_URL/https/wss}/ws/{slug}${NC}"
echo ""
echo -e "  ${YELLOW}Environment Variables (Backend — Railway):${NC}"
echo -e "    DATABASE_URL  = ${DATABASE_URL:0:30}..."
echo -e "    SECRET_KEY    = ${SECRET_KEY:0:8}..."
echo -e "    CORS_ORIGINS  = ${FRONTEND_URL}"
echo -e "    APP_ENV       = production"
echo ""
echo -e "  ${YELLOW}Environment Variables (Frontend — Vercel):${NC}"
echo -e "    NEXT_PUBLIC_API_URL = ${BACKEND_URL}"
echo ""
echo -e "  ${YELLOW}Verify:${NC}"
echo -e "    curl ${BACKEND_URL}/api/health"
echo -e "    Open ${FRONTEND_URL} in browser"
echo ""
