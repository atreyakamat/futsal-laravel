import cron from 'node-cron';
import { query } from '@/lib/db';
import {
  sendEmail,
  generateBookingRecapEmail,
  generateMorningBookingListEmail,
  DigestArenaCounts,
  DigestBookingRow,
} from '@/lib/email';
import { reportServerError } from '@/lib/error-log';

/** "Today" as a YYYY-MM-DD string in IST, independent of the server's own
 * timezone (the container runs in UTC). */
function istDateString(offsetDays: number = 0): string {
  const now = new Date();
  const istMs = now.getTime() + 5.5 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000;
  return new Date(istMs).toISOString().slice(0, 10);
}

async function getBookingsForDate(date: string, arenaId: number): Promise<DigestBookingRow[]> {
  return query<DigestBookingRow>(
    `SELECT a.name as arena_name, b.time_slot, b.customer_name, b.customer_mobile, b.amount
       FROM bookings b
       JOIN arenas a ON a.id = b.arena_id
      WHERE b.payment_status = 'confirmed'
        AND b.booking_date = ?
        AND b.arena_id = ?
      ORDER BY b.time_slot ASC`,
    [date, arenaId]
  );
}

/** Per-arena confirmed/cancelled/played counts for a date, one row per
 * arena that had at least one booking that day. "Played" = confirmed AND
 * checked_in — the existing venue check-in signal used by security/ticket
 * scanning elsewhere in the codebase. */
async function getBookingCountsByArena(date: string): Promise<DigestArenaCounts[]> {
  return query<DigestArenaCounts>(
    `SELECT a.id as arena_id, a.name as arena_name,
            COUNT(*) FILTER (WHERE b.payment_status = 'confirmed')::int AS confirmed,
            COUNT(*) FILTER (WHERE b.payment_status = 'cancelled')::int AS cancelled,
            COUNT(*) FILTER (WHERE b.payment_status = 'confirmed' AND b.checked_in = true)::int AS played
       FROM bookings b
       JOIN arenas a ON a.id = b.arena_id
      WHERE b.booking_date = ?
      GROUP BY a.id, a.name
      ORDER BY a.name ASC`,
    [date]
  );
}

/** Sends the 8pm IST end-of-day recap (today's confirmed/cancelled/played
 * counts) to super admins + platform-wide turf admins (one consolidated
 * all-turfs email each) and to each arena's managers (arena-scoped).
 * Accountants receive nothing. */
export async function sendDailyDigest() {
  const todayDate = istDateString(0);

  const arenaBreakdown = await getBookingCountsByArena(todayDate);
  const totals = arenaBreakdown.reduce(
    (acc, a) => ({
      confirmed: acc.confirmed + a.confirmed,
      cancelled: acc.cancelled + a.cancelled,
      played: acc.played + a.played,
    }),
    { confirmed: 0, cancelled: 0, played: 0 }
  );

  const globalEmail = generateBookingRecapEmail({
    scopeLabel: 'All Turfs',
    date: todayDate,
    ...totals,
    arenaBreakdown,
  });

  const [superAdmins, turfAdmins] = await Promise.all([
    query<{ email: string }>(`SELECT email FROM super_admins WHERE is_active = true`),
    query<{ email: string }>(`SELECT email FROM arena_admins WHERE arena_id IS NULL AND is_active = true`),
  ]);

  for (const recipient of [...superAdmins, ...turfAdmins]) {
    try {
      await sendEmail({ to: recipient.email, ...globalEmail });
    } catch (err) {
      reportServerError(err, { route: 'daily-digest-cron', step: 'send_global_recap', recipient: recipient.email });
    }
  }

  const breakdownByArenaId = new Map(arenaBreakdown.map((a) => [a.arena_id, a]));
  const arenas = await query<{ id: number; name: string }>(`SELECT id, name FROM arenas WHERE status = 'active'`);

  for (const arena of arenas) {
    const managers = await query<{ email: string }>(
      `SELECT email FROM arena_admins WHERE arena_id = ? AND is_active = true`,
      [arena.id]
    );
    if (managers.length === 0) continue;

    const counts = breakdownByArenaId.get(arena.id) ?? { confirmed: 0, cancelled: 0, played: 0 };
    const arenaEmail = generateBookingRecapEmail({
      scopeLabel: arena.name,
      date: todayDate,
      confirmed: counts.confirmed,
      cancelled: counts.cancelled,
      played: counts.played,
    });

    for (const recipient of managers) {
      try {
        await sendEmail({ to: recipient.email, ...arenaEmail });
      } catch (err) {
        reportServerError(err, { route: 'daily-digest-cron', step: 'send_arena_recap', arenaId: arena.id, recipient: recipient.email });
      }
    }
  }
}

/** Sends the 5am IST same-day booking list (time slot, customer, amount) to
 * each arena's managers only — super admins, turf admins, and accountants
 * receive nothing from this job. Gives managers the day's schedule before
 * it starts, distinct from the 8pm end-of-day recap. */
export async function sendMorningBookingList() {
  const todayDate = istDateString(0);

  const arenas = await query<{ id: number; name: string }>(`SELECT id, name FROM arenas WHERE status = 'active'`);

  for (const arena of arenas) {
    const managers = await query<{ email: string }>(
      `SELECT email FROM arena_admins WHERE arena_id = ? AND is_active = true`,
      [arena.id]
    );
    if (managers.length === 0) continue;

    const bookings = await getBookingsForDate(todayDate, arena.id);
    const arenaEmail = generateMorningBookingListEmail({
      scopeLabel: arena.name,
      date: todayDate,
      bookings,
    });

    for (const recipient of managers) {
      try {
        await sendEmail({ to: recipient.email, ...arenaEmail });
      } catch (err) {
        reportServerError(err, { route: 'morning-booking-list-cron', step: 'send_arena_list', arenaId: arena.id, recipient: recipient.email });
      }
    }
  }
}

let dailyDigestStarted = false;

/** Registers the 8:00 PM IST daily recap job. Guarded to start once per
 * server process (see lib/refund-cron.ts for the same pattern). */
export function startDailyDigestCron() {
  if (dailyDigestStarted) return;
  dailyDigestStarted = true;

  cron.schedule(
    '0 20 * * *',
    async () => {
      try {
        await sendDailyDigest();
      } catch (err) {
        reportServerError(err, { route: 'daily-digest-cron', step: 'send_daily_digest' });
      }
    },
    { timezone: 'Asia/Kolkata' }
  );

  console.info('[daily-digest-cron] Scheduled daily booking recap for 8:00 PM IST.');
}

let morningBookingListStarted = false;

/** Registers the 5:00 AM IST morning booking-list job. Guarded to start
 * once per server process (see lib/refund-cron.ts for the same pattern). */
export function startMorningBookingListCron() {
  if (morningBookingListStarted) return;
  morningBookingListStarted = true;

  cron.schedule(
    '0 5 * * *',
    async () => {
      try {
        await sendMorningBookingList();
      } catch (err) {
        reportServerError(err, { route: 'morning-booking-list-cron', step: 'send_morning_booking_list' });
      }
    },
    { timezone: 'Asia/Kolkata' }
  );

  console.info('[morning-booking-list-cron] Scheduled morning booking list for 5:00 AM IST.');
}
