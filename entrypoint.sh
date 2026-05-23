#!/bin/sh
set -e

echo "Running DB init script..."
node ./scripts/db-init.cjs

echo "Starting app"
exec node server.js
