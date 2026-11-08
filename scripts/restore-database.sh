#!/usr/bin/env bash
# ============================================================
# SmartPrint — Safe Database Restore Script
# Usage: ./scripts/restore-database.sh /path/to/backup_file.sql.gz
# ============================================================
set -euo pipefail

if [ $# -lt 1 ]; then
    echo "Usage: $0 <path_to_backup.sql.gz>"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file not found at: $BACKUP_FILE"
    exit 1
fi

echo "=============================================="
echo "⚠️  WARNING: DATABASE RESTORATION"
echo " Target file: $BACKUP_FILE"
echo " This operation will replace existing data in the database!"
echo "=============================================="
read -r -p "Are you sure you want to proceed with restore? [y/N]: " CONFIRM
if [[ ! "$CONFIRM" =~ ^[yY]$ ]]; then
    echo "Restoration aborted by user."
    exit 0
fi

DB_NAME="${DB_NAME:-smartprint}"
DB_USER="${DB_USER:-smartprint_user}"
DB_PASSWORD="${DB_PASSWORD:-}"

echo "🔄 Decompressing and importing data into $DB_NAME..."

if [ -n "$DB_PASSWORD" ]; then
    gunzip -c "$BACKUP_FILE" | MYSQL_PWD="$DB_PASSWORD" mysql -u "$DB_USER" "$DB_NAME"
else
    gunzip -c "$BACKUP_FILE" | sudo mysql "$DB_NAME"
fi

echo "✅ Database restored successfully from: $BACKUP_FILE"
