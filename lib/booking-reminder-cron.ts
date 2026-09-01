import cron from 'node-cron';
import { query } from '@/lib/db';
import { getBookingTimeRange } from '@/lib/refund-policy';
import { mergeSlots } from '@/lib/slot-merge';
import { notifyCustomerOfUpcomingSlot } from '@/lib/push';
import { reportServerError } from '@/lib/error-log';

/** "Today"/"tomorrow" as YYYY-MM-DD strings in IST — same helper shape as
 * lib/daily-digest-cron.ts's istDateString, needed here because a booking
 * near midnight IST can fall 30 minutes before start on the next calendar
 * date relative to the server's own UTC clock. */
function istDateString(offsetDays: number): string {
  const now = new Date();
  const istMs = now.getTime() + 5.5 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000;
  return new Date(istMs).toISOString().slice(0, 10);
}

type ReminderCandidate = {
  booking_ref: string;
  user_id: number;
  booking_date: string;
  arena_name: string;
  time_slots: string[];
};

const REMINDER_WINDOW_MIN_MS = 25 * 60 * 1000;
const REMINDER_WINDOW_MAX_MS = 35 * 60 * 1000;

/**
 * Finds confirmed bookings starting in ~25–35 minutes and pushes a "your
 * slot starts soon" notification to the customer who made it. The 10-minute
 * window (vs. the cron's 5-minute tick) gives every booking at least one
 * chance to land inside it even if a tick runs a little late; reminder_sent_at
 * is what actually prevents a booking from ever being reminded twice, not
 * the window width.
 */
export async function sendUpcomingSlotReminders() {
  const candidates = await query<ReminderCandidate>(
    `SELECT b.booking_ref, b.user_id, b.booking_date, a.name AS arena_name,
            ARRAY_AGG(b.time_slot) AS time_slots
       FROM bookings b
       JOIN arenas a ON a.id = b.arena_id
      WHERE b.payment_status = 'confirmed'
        AND b.reminder_sent_at IS NULL
        AND b.booking_date IN (?, ?)
      GROUP BY b.booking_ref, b.user_id, b.booking_date, a.name`,
    [istDateString(0), istDateString(1)]
  );

  const now = Date.now();

  for (const candidate of candidates) {
    const { bookingStart } = getBookingTimeRange(candidate.booking_date, candidate.time_slots);
    const msUntilStart = bookingStart.getTime() - now;
    if (msUntilStart < REMINDER_WINDOW_MIN_MS || msUntilStart > REMINDER_WINDOW_MAX_MS) continue;

    try {
      await notifyCustomerOfUpcomingSlot({
        booking_ref: candidate.booking_ref,
        user_id: candidate.user_id,
        arena_name: candidate.arena_name,
        booking_date: candidate.booking_date,
        time_slot: mergeSlots(candidate.time_slots).join(', '),
      });
    } catch (err) {
      reportServerError(err, { route: 'booking-reminder-cron', step: 'notify', bookingRef: candidate.booking_ref });
    } finally {
      // Marked regardless of send outcome — the 25-35 min window has passed
      // by the next tick either way, so retrying would just resend a stale
      // "starts in 30 minutes" notice a few minutes before/after the fact.
      await query(`UPDATE bookings SET reminder_sent_at = NOW() WHERE booking_ref = ?`, [candidate.booking_ref]);
    }
  }
}

let started = false;

/** Registers the every-5-minutes upcoming-slot reminder job. Guarded to
 * start once per server process (see lib/refund-cron.ts for the same
 * pattern). */
export function startBookingReminderCron() {
  if (started) return;
  started = true;

  cron.schedule(
    '*/5 * * * *',
    async () => {
      try {
        await sendUpcomingSlotReminders();
      } catch (err) {
        reportServerError(err, { route: 'booking-reminder-cron', step: 'send_upcoming_slot_reminders' });
      }
    },
    { timezone: 'Asia/Kolkata' }
  );

  console.info('[booking-reminder-cron] Scheduled upcoming-slot push reminders every 5 minutes.');
}
