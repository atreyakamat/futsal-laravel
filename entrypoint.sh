#!/bin/sh
set -e

echo "Starting FutsalGoa container..."


echo "Applying Prisma Migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma || echo "Migration failed or already applied"

echo "Applying database seeding and bootstrapping..."
node scripts/db-init.cjs || echo "Database seeding failed or already seeded"
node scripts/seed-assagao.js || echo "Assagao seeding failed"

echo "Starting Next.js Server..."
exec node server.js
