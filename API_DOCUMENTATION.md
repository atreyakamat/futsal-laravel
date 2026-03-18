# FutsalGoa API Integration Guide

## 1. WhatsApp API (Aisensy)
The platform is pre-configured to use **Aisensy** for WhatsApp notifications.

### Configuration
Add these to your `.env`:
```env
AISENSY_API_KEY="your_aisensy_api_token_here"
AISENSY_CAMPAIGN_NAME="booking_confirmation"
```

### Template Requirements
Your Aisensy template should accept the following parameters in order:
1. Customer Name
2. Arena Name
3. Booking Date
4. Time Slots
5. Payment Status
6. Venue Address
7. Google Maps Link
8. Ticket QR Code URL

---

## 2. Email API (Amazon SES)
Laravel's native mailer is used for sending QR tickets.

### Configuration
Add these to your `.env`:
```env
MAIL_MAILER=ses
MAIL_FROM_ADDRESS="info@futsalgoa.com"
MAIL_FROM_NAME="FutsalGoa"
AWS_ACCESS_KEY_ID="your_aws_key"
AWS_SECRET_ACCESS_KEY="your_aws_secret"
AWS_DEFAULT_REGION="us-east-1"
```

---

## 3. QR Code Logic
The system generates QR codes using the `qrserver.com` API to ensure high compatibility without requiring extra PHP extensions like `ext-gd`.

- **Ticket Number Format:** `TKT-YYMMDD-RAND`
- **Data Encoded:** The plain text ticket number for verification by security.

---

## 4. Admin Management (Filament)
Access the advanced management dashboard at `/admin`.

### Roles & Credentials
| Role | Email | Default Password |
| :--- | :--- | :--- |
| Super Admin | `superadmin@futsalgoa.com` | `password` |
| Admin | `admin@futsalgoa.com` | `password` |
| Security | `security@futsalgoa.com` | `password` |

### Key Features
- **Booking Management:** Full CRUD for all bookings.
- **Entry Confirmation:** Security can search by ticket number and click "Confirm Entry".
- **Advanced Pricing:** Admins can request price changes which Super Admins must approve.
- **Approval System:** Super Admins can monitor and approve free bookings or pricing updates via the "Administration" sidebar.
