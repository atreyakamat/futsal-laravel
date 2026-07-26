# ⚽ Agnel Arena Futsal & Turf Booking Platform (v1.0.0 Release Candidate)

Enterprise-grade, high-concurrency multi-arena futsal booking and management platform built with Next.js 15 App Router, PostgreSQL, PayU Gateway Integration, and AiSensy WhatsApp / SMS authentication.

---

## 🚀 1. Project Overview

Agnel Arena Futsal is a full-stack real-time booking ecosystem designed for futsal turfs and sports venues. It features:
- **Instant OTP Authentication:** Seamless mobile-based login via AiSensy WhatsApp API or SMS fallback.
- **Concurrent Slot Locking:** 10-minute session slot locks to prevent double-booking collisions during checkout.
- **Payment Lifecycle & Ticket Security:** PayU payment gateway integration with payment status enforcement (`confirmed`, `failed`, `cancelled`), restricting PDF ticket access exclusively to confirmed bookings.
- **PayU Method Restrictions:** Dynamically restricts checkout payment modes to UPI, Debit Cards, Net Banking, and Wallets (excludes Credit Cards, EMI, and BNPL).
- **Flexible Refund Engine:** Customer self-cancellation threshold ($\ge 3$ hours prior) with automatic 5% service fee deduction; Super Admin force-refund override requiring justification and immutable audit logging.
- **Arena Admin Rescheduling:** Enables venue managers to shift confirmed bookings to available slots while preserving booking references and notifying customers via WhatsApp.
- **Multi-Role Access Control:** Separate portals and capabilities for Customers, Arena Managers, Security Gatekeepers, and Super Admins.

---

## 🛠️ 2. Tech Stack

- **Core Framework:** Next.js 15 (App Router, Server Actions, Dynamic API Routes)
- **Language:** TypeScript (Strict mode enabled)
- **Database Engine:** PostgreSQL 16
- **ORMs & Database Drivers:** Prisma ORM 5 & `pg` native connection pool
- **Styling & UI:** TailwindCSS, Vanilla CSS Modules, Lucide React Icons
- **Payment Gateway:** PayU Gateway API (Configurable restrictions via `PAYU_ENFORCE_PAYMETHOD`)
- **Messaging & OTP:** AiSensy WhatsApp API & Mock SMS Provider
- **Containerization:** Docker & Multi-stage Docker Compose

---

## 📂 3. Repository Directory Structure

```text
futsal-laravel/
├── app/                        # Next.js App Router Routes & Portals
│   ├── api/                    # RESTful Backend API Endpoints
│   │   ├── auth/               # OTP Generation & Verification APIs
│   │   ├── bookings/           # Slot Locks, Cancellations, & History APIs
│   │   ├── fg-admin/           # Platform & Arena Admin Endpoints
│   │   ├── payment/            # PayU Initiation, Callbacks, & Webhooks
│   │   └── ticket/             # PDF Ticket Generation & Verification
│   ├── booking/                # Customer Booking & Ticket Views
│   ├── fg-admin/               # Admin Management Dashboards
│   └── layout.tsx              # Root App Layout & Context Providers
├── components/                 # Reusable UI Components & Modals
│   ├── RescheduleBookingBtn.tsx # Arena Admin Reschedule Modal Component
│   └── SuperAdminRefundBtn.tsx  # Multi-slot Force Refund Breakdown Modal
├── docker/                     # Docker Configuration Scripts
├── lib/                        # Core Domain Logic & Business Rules
│   ├── admin.ts                # Admin Context & RBAC Permissions
│   ├── db.ts                   # Self-healing PostgreSQL Connection Pool
│   ├── domain.ts               # Slot Calculations & Booking Mutations
│   ├── payment.ts              # PayU Signatures & Enforce Param Helpers
│   ├── refund-policy.ts        # 3h Cutoff & 5% Fee Business Logic
│   ├── session.ts              # Encrypted JWT Cookie Sessions
│   └── sms.ts                  # AiSensy WhatsApp & Mock SMS Providers
├── prisma/                     # Database Schema & Migrations
│   └── schema.prisma           # Relational Models & Indexes
├── public/                     # Static Assets & Images
├── scripts/                    # Database Seeding & Setup Utilities
│   ├── db-init.cjs             # Production Schema & Admin Initializer
│   └── seed-assagao.js         # Venue & Pricing Template Seeder
├── tests/                      # Automated Unit & Integration Tests
│   └── unit/                   # Vitest & tsx Safeguard Test Suites
├── Dockerfile                  # Production Multi-Stage Node.js Dockerfile
├── docker-compose.yml          # Production Orchestration (App + PostgreSQL)
├── entrypoint.sh               # Container Startup Script (Migrations + Seeding)
└── README.md                   # System Documentation
```

---

## ⚡ 4. Local Installation & Setup

### Prerequisites
- Node.js `v20.x` or `v22.x`
- PostgreSQL `16.x` (Running locally or via Docker)
- Git

### Quickstart Steps

1. **Clone Repository & Install Dependencies:**
   ```bash
   git clone https://github.com/your-org/futsal-laravel.git
   cd futsal-laravel
   npm install
   ```

2. **Configure Environment File:**
   ```bash
   cp .env.example .env
   ```

3. **Database Migration & Client Generation:**
   ```bash
   npm run db:generate
   node scripts/setup-local-db.cjs
   ```

4. **Launch Local Development Server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` (or `http://localhost:3001`).

---

## 🐳 5. Docker Setup & Deployment

Deploy the entire stack (Next.js web application + PostgreSQL container) with a single command:

```bash
docker compose up --build -d
```

### Container Services
- **Application Portal:** `http://localhost:3001`
- **PostgreSQL Database:** `localhost:5434` (Internal Docker network container `futsal_postgres:5432`)

### Shutdown & Volume Reset
```bash
# Stop containers
docker compose down

# Stop containers and purge database volume
docker compose down -v
```

---

## ⚙️ 6. Environment Variables Reference

| Variable Name | Category | Description | Default / Example |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | **Required** | PostgreSQL connection string | `postgresql://postgres:postgres@postgres:5432/futsal_laravel` |
| `NODE_ENV` | **Required** | Application mode | `production` or `development` |
| `NEXT_PUBLIC_APP_URL` | **Required** | Public application base URL | `http://localhost:3001` |
| `SESSION_SECRET` | **Required** | JWT Session secret key | 32+ character random string |
| `COOKIE_SECRET` | **Required** | Signed cookie encryption key | 32+ character random string |
| `PAYU_MERCHANT_KEY` | Optional | PayU merchant key | Merchant Key string |
| `PAYU_MERCHANT_SALT` | Optional | PayU merchant salt | Merchant Salt string |
| `PAYU_ENFORCE_PAYMETHOD`| Optional | Restricted payment modes | `UPI\|DC\|CASH\|NB` |
| `SMS_PROVIDER` | Optional | SMS gateway provider | `aisensy` or `mock` |
| `AISENSY_API_KEY` | Optional | AiSensy WhatsApp JWT Key | AiSensy API Key string |
| `IS_DOCKER` | Dev Only | Flags execution inside Docker | `true` or `false` |

---

## 🗄️ 7. Database Initialization & Automatic Migrations

When running via Docker (`docker-compose.yml`), container initialization executes `entrypoint.sh`:
1. `npx prisma migrate deploy` applies latest PostgreSQL migrations.
2. `scripts/seed-assagao.js` seeds venue records, courts, pricing templates, and slot timings.
3. `scripts/db-init.cjs` verifies default Super Admin and Arena Manager user credentials.

---

## 🔧 8. Troubleshooting Matrix

| Issue / Error | Root Cause | Resolution |
| :--- | :--- | :--- |
| `ENOTFOUND postgres` | Host Node.js app cannot resolve Docker hostname `postgres`. | `lib/db.ts` contains automatic self-healing fallback to `127.0.0.1:5432/5434` when running on host OS outside Docker. |
| `403 Forbidden` on Ticket PDF | Booking `payment_status` is `pending`, `failed`, or `cancelled`. | Tickets are strictly protected and available **ONLY** when `payment_status === 'confirmed'`. |
| PayU Checkout Shows Credit Cards | `PAYU_ENFORCE_PAYMETHOD` not passed. | Verify `PAYU_ENFORCE_PAYMETHOD=UPI\|DC\|CASH\|NB` is set in `.env`. |
| OTP Not Received on Mobile | `SMS_PROVIDER` set to `mock` or missing AiSensy key. | Set `SMS_PROVIDER=aisensy` and verify `AISENSY_API_KEY` in `.env`. |

---

## 🧪 9. Build & Test Verification

Run automated test suites and verify production build compilation:

```bash
# Run unit & safeguard tests
npx tsx tests/unit/refund-policy.test.ts
npx tsx tests/unit/payment-lifecycle-safeguards.test.ts

# Production build compilation check
npm run build
```

---

*Agnel Arena Futsal Platform v1.0.0 Release Candidate — Ready for Staging & Production Deployment.*
