# FutsalGoa - Premium Futsal Booking Platform

A modern, full-stack futsal arena booking platform built with Next.js, Tailwind CSS, PostgreSQL, and TypeScript.

## Features

- ✅ **User Authentication** - OTP-based login for customers
- ✅ **Admin Portal** - Role-based admin dashboard (super_admin, admin, security)
- ✅ **Arena Management** - Create and manage futsal arenas
- ✅ **Real-time Booking** - Slot locking with expiration, atomic transactions
- ✅ **Security Portal** - QR code ticket verification and check-in system
- ✅ **Responsive Design** - Beautiful dark theme with Tailwind CSS
- ✅ **Database-backed Sessions** - PostgreSQL session management
- ✅ **Docker Support** - Full Docker and Docker Compose setup

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS 4
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL
- **ORM**: Prisma (schema definition)
- **Authentication**: OTP-based with bcrypt hashing
- **Container**: Docker & Docker Compose

## Project Structure

```
futsal-laravel/
├── app/
│   ├── admin/                      # Admin portal routes
│   │   ├── login/                  # Admin OTP login
│   │   ├── dashboard/              # Admin dashboard
│   │   ├── arenas/                 # Arena management
│   │   ├── bookings/               # Booking management
│   │   ├── users/                  # User management
│   │   ├── security/               # Security portal link
│   │   ├── reports/                # Reports & analytics
│   │   └── settings/               # System settings (super_admin only)
│   ├── api/                        # API routes
│   │   ├── auth/                   # Authentication endpoints
│   │   │   ├── send-otp/
│   │   │   ├── verify-otp/
│   │   │   ├── admin/              # Admin-specific auth
│   │   │   └── logout/
│   │   ├── admin/                  # Admin API endpoints
│   │   ├── arenas/                 # Arena API
│   │   ├── bookings/               # Booking API
│   │   ├── security/               # Security/verification API
│   │   ├── payment/                # Payment callbacks
│   │   └── slots/                  # Slot management
│   ├── security/                   # Security portal pages
│   ├── booking/                    # Booking pages
│   ├── arena/                      # Arena detail pages
│   ├── dashboard/                  # User dashboard
│   ├── login/                      # User login
│   ├── payment/                    # Payment pages
│   ├── globals.css                 # Global styles & utilities
│   └── layout.tsx                  # Root layout
├── components/                     # Reusable React components
├── lib/                           # Utility functions
│   ├── db.ts                       # Database pool and queries
│   ├── domain.ts                   # Business logic
│   ├── session.ts                  # Session management
│   └── types.ts                    # TypeScript types
├── prisma/
│   ├── schema.prisma               # Database schema definition
│   └── migrations/                 # Database migrations
├── docker/
│   └── postgres-init/              # Database initialization scripts
├── public/                         # Static assets
├── package.json
├── tailwind.config.ts              # Tailwind configuration
├── tsconfig.json                   # TypeScript configuration
├── next.config.mjs                 # Next.js configuration
├── Dockerfile                      # Docker image definition
└── docker-compose.yml              # Docker Compose setup

## Installation & Setup

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd futsal-laravel
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up PostgreSQL locally**
   - Install PostgreSQL 16 or later
   - Create a database: `createdb futsal_laravel`

4. **Configure environment**
   ```bash
   # Copy and edit .env file
   cp .env.example .env
   
   # Set DATABASE_URL to your local PostgreSQL connection
   DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/futsal_laravel?schema=public"
   ```

5. **Initialize database**
   ```bash
   # Run migrations and seed data
   npm run db:init
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`

### Docker Setup

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up --build
   ```

   The application will be available at `http://localhost:3333`

2. **Database will be initialized automatically** with:
   - Database schema
   - Demo data (sample arena, admin users)
   - Time slot pricing

3. **View logs**
   ```bash
   docker-compose logs -f app
   docker-compose logs -f postgres
   ```

4. **Stop containers**
   ```bash
   docker-compose down
   ```

## User Roles

### Super Admin
- Full system access
- Create/manage other admins
- System settings and configuration
- View all reports and analytics

### Admin
- Manage assigned arenas
- View and process bookings
- Check in customers at security portal

### Security
- Verify tickets by ticket number
- Confirm entry/check-in
- Use the security portal for validation

### Customer
- Browse available arenas
- Book time slots
- OTP-based login
- View booking history
- Receive QR code tickets

## Authentication Flow

### Customer Login
1. User enters email or mobile number
2. System generates 6-digit OTP
3. OTP stored in `user_otps` table (expires in 10 minutes)
4. User verifies OTP
5. Auth cookie set with user ID
6. Redirected to dashboard or booking page

### Admin Login
1. Admin enters email or mobile
2. System verifies user is admin/super_admin
3. OTP generated and sent
4. Same verification flow as customers
5. Redirected to admin dashboard

## Database Schema

### Core Tables

**users**
- id, name, email, customer_mobile, password, role, created_at, updated_at
- Roles: customer, admin, super_admin, security

**arenas**
- id, name, slug, address, description, cover_image, status, bot_enabled, gmaps_link, created_at, updated_at
- Status: active, inactive

**bookings**
- id, ticket_number, booking_ref, user_id, arena_id, booking_date, time_slot, customer_name, customer_mobile, customer_email, amount, payment_status, payment_method, payu_mihpayid, notes, checked_in, checked_in_at, checked_in_by, is_free_booking, created_at, updated_at
- payment_status: pending, confirmed, failed

**pricings**
- id, arena_id, time_slot, price, created_at, updated_at

**slot_locks**
- id, arena_id, booking_date, time_slot, session_id, locked_at, expires_at, created_at
- Temporary locks for 10 minutes during checkout

**user_otps**
- id, identifier (email/mobile), otp (bcrypt hashed), expires_at, created_at, updated_at

**arena_managers**
- id, user_id, arena_id, role (manager), created_at, updated_at
- Legacy arena manager mapping retained for backwards compatibility

**settings**
- id, key (unique), value, created_at, updated_at
- System-wide configuration

## API Endpoints

### Authentication
- `POST /api/auth/send-otp` - Send OTP to email/mobile
- `POST /api/auth/verify-otp` - Verify OTP and authenticate
- `POST /api/auth/admin/send-otp` - Send OTP to admin
- `POST /api/auth/admin/verify-otp` - Verify admin OTP
- `POST /api/auth/logout` - Logout

### Arenas
- `GET /api/arenas` - List active arenas
- `GET /api/arenas/[slug]` - Get arena details
- `POST /api/admin/arenas` - Create arena (admin only)

### Bookings
- `POST /api/bookings/process` - Create booking
- `POST /api/payment/callback` - Payment confirmation

### Slots
- `POST /api/slots/lock` - Lock slots during checkout
- `POST /api/slots/unlock` - Release slot locks
- `GET /api/slots/status` - Get slot availability

### Security
- `POST /api/security/confirm-entry` - Check in customer
- `GET /api/security/verify/[ticket_number]` - Verify ticket

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/futsal_laravel

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Payment Gateway (Optional)
PAYU_MERCHANT_KEY=
PAYU_SALT=
PAYU_BASE_URL=https://test.payu.in

# AI Features (Optional)
AI_CHAT_ENABLED=true
AI_PROVIDER=openrouter
AI_MODEL=openai/gpt-4o-mini
OPENROUTER_API_KEY=
```

## Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Available Scripts

```bash
npm run dev           # Start development server
npm run build         # Build for production
npm start             # Start production server
npm run lint          # Run ESLint
npm run db:pull       # Pull database schema
npm run db:generate   # Generate Prisma client
npm run db:init       # Initialize database with migrations and seed
```

## Styling

The project uses:
- **Tailwind CSS 4** for utility-based styling
- **Custom CSS** in `globals.css` for component styles and reusable classes
- **CSS Variables** for theme colors and design tokens
- **Dark theme** with green primary color (#0df220)

### Custom CSS Classes

```css
.glass           /* Glassmorphic components */
.button          /* Primary button styling */
.hero-card       /* Hero section card */
.form-card       /* Form container */
.pill            /* Badge/pill styling */
.display         /* Large display heading */
.form            /* Form layout */
.field           /* Form field wrapper */
```

## Security Considerations

✅ **Implemented:**
- OTP-based passwordless authentication
- Bcrypt password hashing for OTP
- HTTP-only secure cookies
- SQL parameterized queries (protection against SQL injection)
- Role-based access control
- CSRF protection via form method validation

⚠️ **To Implement:**
- Rate limiting on OTP endpoints
- HTTPS in production
- Content Security Policy headers
- CORS configuration for API endpoints
- Payment gateway security (PCI compliance)

## Performance Optimizations

- Server-side rendering with Next.js
- Database connection pooling (max 10 connections)
- Indexed database queries for common lookups
- Slot locking with database transactions
- Static page generation where possible
- CSS minification with Tailwind
- JavaScript code splitting

## Deployment

### Docker Deployment

```bash
# Build Docker image
docker build -t futsal-laravel:latest .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://postgres:postgres@db:5432/futsal_laravel?schema=public" \
  futsal-laravel:latest
```

### Environment-specific Setup

**Development**
- DATABASE_URL points to local PostgreSQL
- NEXT_PUBLIC_APP_URL=http://localhost:3000

**Staging**
- DATABASE_URL points to staging PostgreSQL
- NEXT_PUBLIC_APP_URL=https://staging.futsalgoa.com

**Production**
- DATABASE_URL points to production PostgreSQL with strong credentials
- NEXT_PUBLIC_APP_URL=https://futsalgoa.com
- NODE_ENV=production
- Enable HTTPS

## Troubleshooting

### Database Connection Issues
```bash
# Test database connection
psql $DATABASE_URL

# Check if migrations are applied
SELECT * FROM "users";

# Re-initialize database
npm run db:init
```

### Build Failures
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

### Docker Issues
```bash
# View logs
docker-compose logs -f

# Rebuild containers
docker-compose build --no-cache
docker-compose up
```

## Contributing

1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m 'Add amazing feature'`
3. Push to branch: `git push origin feature/amazing-feature`
4. Open a Pull Request

## License

Proprietary - FutsalGoa (2026)

## Support

For issues and questions, please contact the development team or open an issue in the repository.

---

**Last Updated**: May 26, 2026
**Status**: Production Ready ✅
