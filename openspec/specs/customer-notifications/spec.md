# Customer Notifications Specification

## Purpose
Defines the channels (email, WhatsApp, push) used to keep customers and staff informed about booking lifecycle events, and the constraints each channel imposes.

## Requirements

### Requirement: Email is sent via AWS SES for every booking lifecycle milestone
The system SHALL send an email for: booking confirmed, booking rescheduled, refund completed, a staff-created booking awaiting payment (once at creation), and a payment reminder (once, ~1 hour before an unpaid staff-created booking's slot).

#### Scenario: SES not configured
- **WHEN** AWS SES credentials are not set in the environment
- **THEN** the email send fails gracefully and is logged, without blocking the underlying booking action it was attached to

### Requirement: WhatsApp messages require a pre-approved Meta template per message type
Every outbound WhatsApp template (booking confirmed, rescheduled, OTP, payment reminder) SHALL be backed by its own Meta-approved template, configured by campaign name via environment variable. A message type with no configured template SHALL be skipped with a clear log entry rather than sent using a mismatched approved template or sent unapproved.

#### Scenario: New message type added without an approved template yet
- **WHEN** code sends a message type whose campaign-name environment variable is unset
- **THEN** the WhatsApp send is skipped and logged; it never falls back to reusing a different template's approved content

### Requirement: Push notifications alert staff and remind customers
Staff with an active push subscription SHALL be notified the moment a new booking is created. A customer with an active push subscription SHALL receive a reminder roughly 25-35 minutes before a confirmed booking's slot starts, sent at most once per booking.

#### Scenario: Confirmed booking approaching start time
- **WHEN** a confirmed booking's slot is 25-35 minutes away and no reminder has been sent yet for it
- **THEN** the customer receives a push notification and the booking is marked so it is never reminded twice
