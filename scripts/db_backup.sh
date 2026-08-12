#!/bin/bash
# Agnel Arena - Production Database Backup Script
set -e

BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/futsal_db_backup_$TIMESTAMP.sql"

echo "Creating database backup..."
# We execute pg_dump inside the PostgreSQL container and write it to the host
docker exec futsal_postgres pg_dump -U postgres -d futsal_laravel > "$BACKUP_FILE"

if [ -s "$BACKUP_FILE" ]; then
    echo "Backup completed successfully: $BACKUP_FILE"
    ls -lh "$BACKUP_FILE"
else
    echo "Error: Backup file is empty!"
    rm -f "$BACKUP_FILE"
    exit 1
fi
