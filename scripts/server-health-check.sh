#!/usr/bin/env bash
# ============================================================
# SmartPrint — Server & Application Health Diagnostic Script
# Usage: ./scripts/server-health-check.sh
# ============================================================
set -euo pipefail

echo "=============================================="
echo " SmartPrint System Health Audit"
echo " Host: $(hostname) | Date: $(date)"
echo "=============================================="

# 1. Nginx Status
echo -n "🌐 Nginx Web Server: "
if systemctl is-active --quiet nginx; then
    echo "RUNNING (Active) ✅"
else
    echo "FAILED / STOPPED ❌"
fi

# 2. MySQL Status
echo -n "🗄️ MySQL Database:   "
if systemctl is-active --quiet mysql; then
    echo "RUNNING (Active) ✅"
else
    echo "FAILED / STOPPED ❌"
fi

# 3. PM2 Backend Status
echo -n "⚙️ PM2 Backend:      "
if pm2 describe smartprint-api > /dev/null 2>&1; then
    STATUS=$(pm2 jlist | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "STATUS: $STATUS ✅"
else
    echo "NOT REGISTERED / STOPPED ❌"
fi

# 4. HTTP API Probe
echo -n "🔍 API Health Probe: "
HTTP_RESPONSE=$(curl -s -w "\n%{http_code}" http://127.0.0.1:5000/health || echo "000")
HTTP_CODE=$(echo "$HTTP_RESPONSE" | tail -n1)
HTTP_BODY=$(echo "$HTTP_RESPONSE" | head -n1)

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "HTTP 200 OK ✅ ($HTTP_BODY)"
else
    echo "HTTP $HTTP_CODE (Failed) ❌"
fi

# 5. Resource Utilization
echo ""
echo "📊 Memory & Swap Usage:"
free -h

echo ""
echo "💾 Disk Space Usage:"
df -h / | awk 'NR==1 || NR==2'

echo "=============================================="
