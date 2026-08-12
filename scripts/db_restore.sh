#!/bin/bash
# Agnel Arena - Production Database Restore Script
set -e

if [ -z "$1" ]; then
    echo "Usage: ./scripts/db_restore.sh <path_to_backup.sql>"
    exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file $BACKUP_FILE not found!"
    exit 1
fi

echo "WARNING: This will overwrite the current database!"
read -p "Are you sure you want to proceed? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Restoring database from $BACKUP_FILE..."
    
    # Drop and recreate schema to ensure clean restore, then restore from backup
    docker exec -i futsal_postgres psql -U postgres -d futsal_laravel -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
    docker exec -i futsal_postgres psql -U postgres -d futsal_laravel < "$BACKUP_FILE"
    
    echo "Database restoration completed successfully."
else
    echo "Restoration aborted."
fi
