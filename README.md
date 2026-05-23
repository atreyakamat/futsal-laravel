# Futsal Booking Platform (Next.js + PostgreSQL)

Next.js 15 application for futsal arena booking with OTP auth, slot locking, payment callback handling, ticket verification, and admin/security views.

## Stack

- Next.js 15 (App Router)
- TypeScript
- PostgreSQL
- Prisma (schema and client generation)
- Docker + Docker Compose for deployment

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env
```

3. Set `DATABASE_URL` in `.env` (PostgreSQL):

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/futsal_laravel?schema=public
```

4. Sync Prisma schema and generate client:

```bash
npm run db:pull
npm run db:generate
```

5. Start development server:

```bash
npm run dev
```

## Docker Deployment

Run application and PostgreSQL together:

```bash
docker compose up --build -d
```

Services:

- App: http://localhost:3000
- PostgreSQL: `localhost:5432`

Stop services:

```bash
docker compose down
```

Remove services and database volume:

```bash
docker compose down -v
```

## Build Verification

```bash
npm run build
```
