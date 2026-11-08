#!/usr/bin/env bash
# ============================================================
# SmartPrint — Automated MySQL Database Backup Script
# Usage: ./scripts/backup-database.sh
# Can be scheduled via crontab: 0 2 * * * /home/ubuntu/smartprint/scripts/backup-database.sh
# ============================================================
set -euo pipefail

BACKUP_DIR="/home/ubuntu/backups/mysql"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/smartprint_db_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "=============================================="
echo " Starting SmartPrint Database Backup"
echo " Target: $BACKUP_FILE"
echo "=============================================="

DB_NAME="${DB_NAME:-smartprint}"
DB_USER="${DB_USER:-smartprint_user}"
DB_PASSWORD="${DB_PASSWORD:-}"

if [ -n "$DB_PASSWORD" ]; then
    MYSQL_PWD="$DB_PASSWORD" mysqldump -u "$DB_USER" --single-transaction --quick "$DB_NAME" | gzip -9 > "$BACKUP_FILE"
else
    # Fallback to sudo mysql auth or socket
    sudo mysqldump --single-transaction --quick "$DB_NAME" | gzip -9 > "$BACKUP_FILE"
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✅ Database backup created successfully! Size: $BACKUP_SIZE"

# Retention policy: remove backups older than 7 days
echo "🧹 Pruning backups older than 7 days..."
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +7 -exec rm -f {} +

echo "Backup routine finished."
