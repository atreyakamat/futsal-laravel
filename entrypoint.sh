#!/bin/sh
set -e

echo "Starting FutsalGoa container..."

echo "Generating Prisma Client..."
npx prisma generate

echo "Applying Prisma Migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma || echo "Migration failed or already applied"

echo "Starting Next.js Server..."
exec node server.js
