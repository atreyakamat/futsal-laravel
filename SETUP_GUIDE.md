# FutsalGoa Platform Setup Guide

Welcome to the FutsalGoa futsal booking platform! This guide will help you set up the project locally and deploy it using Docker.

## Prerequisites

### For Local Development
- **Node.js**: v18 or higher ([Download](https://nodejs.org/))
- **PostgreSQL**: v14 or higher ([Download](https://www.postgresql.org/download/))
- **Git**: ([Download](https://git-scm.com/))

### For Docker Deployment
- **Docker**: ([Download](https://www.docker.com/products/docker-desktop))
- **Docker Compose**: (Usually comes with Docker Desktop)

## Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

The `.env` file contains configuration for the database and admin credentials:

```env
# Database Connection (default for local development)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/futsal_laravel?schema=public"

# Admin Credentials (these are used during database initialization)
ADMIN_EMAIL=admin@example.com
ADMIN_MOBILE=+919999999999
ADMIN_PASSWORD=Admin@123456
```

**Change these credentials before production deployment!**

### 3. Start PostgreSQL

Ensure PostgreSQL is running on your machine:

```bash
# On Windows with PostgreSQL installed
# PostgreSQL should start automatically

# On macOS with Homebrew
brew services start postgresql@14

# On Linux
sudo service postgresql start
```

Verify the connection:
```bash
psql -U postgres -d postgres -c "SELECT version();"
```

### 4. Initialize the Database

```bash
npm run db:setup
```

This script will:
- ✓ Connect to PostgreSQL
- ✓ Create the database and tables
- ✓ Apply schema and seed data
- ✓ Create the initial admin user with credentials from `.env`

### 5. Start the Development Server

```bash
npm run dev
```

The application will be available at: **http://localhost:3001**

### 6. Login to Admin Panel

Go to: **http://localhost:3001/admin/login**

Use your credentials from `.env`:
- Email: `admin@example.com`
- Password: `Admin@123456`

**Note**: The admin login uses OTP (One-Time Password) flow. When you enter your email, an OTP will be generated and logged to the console.

## Docker Deployment

### 1. Configure Environment Variables for Docker

Create a `.env.docker` file or override variables when running Docker:

```bash
# Option 1: Set via environment when running docker-compose
export ADMIN_EMAIL=myteam@futsalgoa.com
export ADMIN_MOBILE=+919876543210
export ADMIN_PASSWORD=SecurePassword123!

# Option 2: Create .env.docker file and use --env-file
docker-compose --env-file .env.docker up
```

### 2. Build and Run with Docker Compose

```bash
# Start all services (app + PostgreSQL)
docker-compose up --build

# Run in background
docker-compose up -d --build

# View logs
docker-compose logs -f app
```

The application will be available at: **http://localhost:3333**

### 3. Initialize Database (if not auto-initialized)

The database is automatically initialized when the app container starts. If you need to reinitialize:

```bash
# Connect to the app container
docker-compose exec app node ./scripts/db-init.cjs

# Or restart the entire stack
docker-compose restart
```

### 4. Access the Admin Panel

Go to: **http://localhost:3333/admin/login**

Use your configured credentials:
- Email: (value from `ADMIN_EMAIL`)
- Mobile: (value from `ADMIN_MOBILE`)
- Password: (value from `ADMIN_PASSWORD`)

## Admin Features

### Roles & Permissions

The platform supports three admin roles:

| Role | Permissions |
|------|-------------|
| **super_admin** | Full system access, manage all arenas, view all bookings, system settings |
| **admin** | Manage multiple arenas, view bookings, manage users |
| **security** | Verify tickets, confirm entry, validate bookings |

### Admin Dashboard

After login, you can:
- 📊 View live statistics (active arenas, bookings, users)
- 🏟️ Manage arenas and create new ones
- 📅 View and manage bookings
- 👥 Manage users and admin accounts
- 🔒 Access security portal for check-ins
- 📈 View reports and analytics
- ⚙️ Configure system settings (super_admin only)

## Project Structure

```
futsal-laravel/
├── app/
│   ├── admin/              # Admin dashboard pages
│   │   ├── dashboard/      # Main admin dashboard
│   │   ├── arenas/         # Arena management
│   │   ├── bookings/       # Booking management
│   │   ├── users/          # User management
│   │   ├── security/       # Security portal
│   │   ├── reports/        # Reports & analytics
│   │   ├── settings/       # System settings
│   │   └── login/          # Admin login page
│   ├── api/
│   │   ├── auth/admin/     # Admin authentication endpoints
│   │   └── ...             # Other API routes
│   ├── security/           # Security/QR check-in pages
│   ├── globals.css         # Global styles & CSS utilities
│   └── layout.tsx          # Root layout
├── lib/
│   ├── db.ts               # Database connection & queries
│   ├── domain.ts           # Business logic & helpers
│   └── session.ts          # Session management
├── prisma/
│   └── schema.prisma       # Database schema definition
├── docker/
│   └── postgres-init/      # Database initialization SQL files
├── scripts/
│   ├── db-init.cjs         # Docker database initialization
│   └── setup-local-db.js   # Local database setup
├── docker-compose.yml      # Docker services configuration
└── Dockerfile              # Docker image definition
```

## Database Schema

The platform uses the following tables:

- **users** - Customer and admin user accounts
- **arenas** - Futsal arena information
- **bookings** - Booking records and history
- **pricings** - Arena pricing configurations
- **slot_locks** - Time slot locking for concurrent bookings
- **user_otps** - OTP storage for authentication
- **settings** - System configuration
- **arena_managers** - Legacy arena manager assignments

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/futsal_laravel` | PostgreSQL connection string |
| `ADMIN_EMAIL` | `admin@example.com` | Initial admin email (for first login) |
| `ADMIN_MOBILE` | `+919999999999` | Initial admin mobile number |
| `ADMIN_PASSWORD` | `Admin@123456` | Initial admin password |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Public app URL |
| `APP_ENV` | `local` | Environment (local/production) |
| `APP_DEBUG` | `true` | Debug mode (true/false) |

## Troubleshooting

### "Database connection refused"
- Ensure PostgreSQL is running
- Check the `DATABASE_URL` in `.env`
- Verify PostgreSQL credentials (default: postgres/postgres)

### "Application error: a server-side exception"
- Check the server logs: `npm run dev` shows console output
- Ensure database is initialized: `npm run db:setup`
- Clear Next.js cache: `rm -rf .next` then rebuild

### "Admin login not working"
- Verify the admin user exists in the database
- Check `.env` for correct `ADMIN_EMAIL` and `ADMIN_MOBILE`
- OTPs are logged to console in development

### Docker container exits immediately
- View logs: `docker-compose logs app`
- Ensure database is healthy: `docker-compose logs postgres`
- Check environment variables are passed correctly

## Production Deployment

### Pre-Deployment Checklist

- [ ] Change `ADMIN_EMAIL`, `ADMIN_MOBILE`, `ADMIN_PASSWORD` to secure values
- [ ] Set `APP_ENV=production` in environment
- [ ] Set `APP_DEBUG=false`
- [ ] Use strong PostgreSQL password
- [ ] Enable HTTPS/TLS
- [ ] Set up proper backup strategy
- [ ] Configure monitoring and logging

### Deploying to Production Server

```bash
# Pull latest code
git pull origin main

# Build Docker image
docker build -t futsal-app:latest .

# Run with secure credentials
docker-compose -f docker-compose.yml up -d \
  -e ADMIN_EMAIL="production-admin@company.com" \
  -e ADMIN_PASSWORD="YourSecurePassword123!" \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db"
```

## Support & Documentation

- 📖 **Next.js Documentation**: https://nextjs.org/docs
- 🐘 **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- 🐳 **Docker Documentation**: https://docs.docker.com/
- 🎨 **Tailwind CSS**: https://tailwindcss.com/docs

## License

This project is part of FutsalGoa platform.
