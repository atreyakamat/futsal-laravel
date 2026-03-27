# Futsal Goa - Arena Booking System

A modern Futsal arena booking and management system built with Laravel, Filament, and AI integration.

## ⚽ Features

### For Users
- **AI Booking Assistant:** Interactive AI chat to find available slots and book arenas using natural language.
- **Arena Discovery:** Browse available arenas with detailed images, descriptions, and Google Maps integration.
- **Real-time Slot Locking:** Prevents double-booking by locking slots during the checkout process.
- **OTP Authentication:** Secure and simple login via mobile/email OTP.
- **Digital Tickets:** Automatic PDF ticket generation with QR codes for easy entry verification.
- **My Bookings:** User dashboard to view and manage past and upcoming reservations.

### For Arena Owners & Admins
- **Filament Admin Panel:** Comprehensive dashboard for managing arenas, pricing, and availability.
- **Approval Workflow:** Manual approval system for specific booking types or free slots.
- **Security Portal:** Dedicated mobile-friendly interface for security guards to scan and verify tickets at the venue.
- **Pricing Management:** Dynamic pricing based on time slots and peak hours.
- **WhatsApp Integration:** Automated notifications for booking confirmations and reminders via AISENSY.

### For Developers
- **AI-First Architecture:** Integrated with OpenRouter/OpenAI for intelligent booking assistance.
- **Modular Services:** Clean separation of logic for payments, slot management, and notifications.
- **RESTful API:** Internal APIs for real-time slot status and lock management.

## 🛠 Tech Stack

- **Framework:** [Laravel 12](https://laravel.com)
- **Admin UI:** [Filament v3](https://filamentphp.com)
- **Frontend:** Vite, Tailwind CSS, Alpine.js
- **Database:** SQLite (default) / MySQL / PostgreSQL
- **AI Provider:** OpenRouter (supporting GPT-4o-mini and others)
- **PDF Generation:** Laravel DomPDF
- **Notifications:** AISENSY (WhatsApp), AWS SES (Email)

## 🚀 Getting Started

### Prerequisites
- PHP 8.2+
- Composer
- Node.js & NPM
- SQLite (or your preferred DB)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd futsal-laravel
   ```

2. **Install dependencies:**
   ```bash
   composer install
   npm install
   ```

3. **Environment Setup:**
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```
   *Configure your AI, WhatsApp, and Email credentials in the `.env` file.*

4. **Database & Assets:**
   ```bash
   touch database/database.sqlite
   php artisan migrate --seed
   npm run build
   ```

5. **Start the application:**
   ```bash
   php artisan serve
   ```

## 📖 Documentation

- [Deployment Guide](DEPLOYMENT.md) - Detailed production setup instructions.
- [API Documentation](API_DOCUMENTATION.md) - Details on internal and external endpoints.

## 🛡 Security & Verification

The system includes a public verification endpoint at `/verify-ticket/{ticket_number}` and a restricted security portal at `/security/scan` for venue-side verification.

## 📝 License

This project is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
