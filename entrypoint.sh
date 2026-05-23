#!/bin/sh
set -e

echo "Running DB init script..."
node ./scripts/db-init.js

echo "Starting app"
exec node server.js
