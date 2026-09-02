import cron from 'node-cron';
import { query } from '@/lib/db';
import { getBookingTimeRange } from '@/lib/refund-policy';
import { sendPaymentReminder } from '@/lib/payment-reminder';
import { reportServerError } from '@/lib/error-log';

/** Same IST-day-string helper as lib/booking-reminder-cron.ts — needed
 * because a slot near midnight IST can fall inside the reminder window on
 * the next calendar date relative to the server's own UTC clock. */
function istDateString(offsetDays: number): string {
  const now = new Date();
  const istMs = now.getTime() + 5.5 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000;
  return new Date(istMs).toISOString().slice(0, 10);
}

type ReminderCandidate = {
  booking_ref: string;
  booking_date: string;
  time_slots: string[];
};

const REMINDER_WINDOW_MIN_MS = 55 * 60 * 1000;
const REMINDER_WINDOW_MAX_MS = 65 * 60 * 1000;

/**
 * Finds staff-created bookings (admin_created) still 'pending' payment,
 * starting in ~55-65 minutes, and sends the customer an email + WhatsApp
 * "pay now or lose the slot" reminder. payment_reminder_sent_at is what
 * actually prevents a double-send, not the window width — same pattern as
 * lib/booking-reminder-cron.ts's reminder_sent_at.
 */
export async function sendPaymentReminders() {
  const candidates = await query<ReminderCandidate>(
    `SELECT b.booking_ref, b.booking_date, ARRAY_AGG(b.time_slot) AS time_slots
       FROM bookings b
      WHERE b.payment_status = 'pending'
        AND b.admin_created = TRUE
        AND b.payment_reminder_sent_at IS NULL
        AND b.booking_date IN (?, ?)
      GROUP BY b.booking_ref, b.booking_date`,
    [istDateString(0), istDateString(1)]
  );

  const now = Date.now();

  for (const candidate of candidates) {
    const { bookingStart } = getBookingTimeRange(candidate.booking_date, candidate.time_slots);
    const msUntilStart = bookingStart.getTime() - now;
    if (msUntilStart < REMINDER_WINDOW_MIN_MS || msUntilStart > REMINDER_WINDOW_MAX_MS) continue;

    try {
      await sendPaymentReminder(candidate.booking_ref);
    } catch (err) {
      reportServerError(err, { route: 'payment-reminder-cron', step: 'send', bookingRef: candidate.booking_ref });
    } finally {
      // Marked regardless of send outcome — the 55-65 min window has passed
      // by the next tick either way, so retrying would just resend a stale
      // "starts in 1 hour" notice well after (or before) the fact.
      await query(`UPDATE bookings SET payment_reminder_sent_at = NOW() WHERE booking_ref = ?`, [candidate.booking_ref]);
    }
  }
}

let started = false;

/** Registers the every-5-minutes payment-reminder job. Guarded to start
 * once per server process (see lib/refund-cron.ts for the same pattern). */
export function startPaymentReminderCron() {
  if (started) return;
  started = true;

  cron.schedule(
    '*/5 * * * *',
    async () => {
      try {
        await sendPaymentReminders();
      } catch (err) {
        reportServerError(err, { route: 'payment-reminder-cron', step: 'send_payment_reminders' });
      }
    },
    { timezone: 'Asia/Kolkata' }
  );

  console.info('[payment-reminder-cron] Scheduled staff-booking payment reminders every 5 minutes.');
}
