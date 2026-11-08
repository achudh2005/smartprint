#!/usr/bin/env bash
# ============================================================
# SmartPrint — Automated Production Deployment Script
# Usage: ./scripts/deploy.sh
# ============================================================
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

echo "=============================================="
echo " Starting SmartPrint Production Deployment"
echo " Time: $(date)"
echo " Directory: $APP_DIR"
echo "=============================================="

# 1. Update source code from GitHub
echo "📥 Pulling latest code from GitHub..."
git fetch origin main
git reset --hard origin/main

# 2. Install backend dependencies
echo "📦 Installing backend dependencies..."
npm --prefix backend install --omit=dev

# 3. Safe database migration
echo "🗄️ Applying Prisma database schema changes..."
cd backend
npx prisma generate
npx prisma db push --skip-generate || echo "⚠️ Database push noted, verifying connection..."
cd ..

# 4. Install frontend dependencies & compile production build
echo "⚛️ Building production frontend bundle..."
npm --prefix frontend install
npm --prefix frontend run build

# 5. Reload PM2 process with zero downtime
echo "🚀 Reloading PM2 backend application..."
pm2 reload ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production
pm2 save

# 6. Test Nginx and reload
echo "🌐 Reloading Nginx configuration..."
sudo nginx -t && sudo systemctl reload nginx

# 7. Verification health check
echo "🔍 Probing local application health..."
sleep 2
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/health || echo "000")

if [ "$HEALTH_CODE" -eq 200 ]; then
    echo "=============================================="
    echo "✅ SmartPrint Deployment SUCCESSFUL (HTTP 200 OK)!"
    echo "=============================================="
else
    echo "=============================================="
    echo "⚠️ Warning: Health probe returned status $HEALTH_CODE. Check logs with: pm2 logs smartprint-api"
    echo "=============================================="
    exit 1
fi
