import cron from 'node-cron';
import { query } from '@/lib/db';
import { sendEmail, generateDailyDigestEmail, DigestArenaSummary, DigestBookingRow } from '@/lib/email';
import { reportServerError } from '@/lib/error-log';

/** "Today"/"tomorrow" as YYYY-MM-DD strings in IST, independent of the
 * server's own timezone (the container runs in UTC). */
function istDateString(offsetDays: number): string {
  const now = new Date();
  const istMs = now.getTime() + 5.5 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000;
  return new Date(istMs).toISOString().slice(0, 10);
}

async function getBookingsForDate(date: string): Promise<DigestBookingRow[]> {
  return query<DigestBookingRow>(
    `SELECT a.name as arena_name, b.time_slot, b.customer_name, b.customer_mobile, b.amount
       FROM bookings b
       JOIN arenas a ON a.id = b.arena_id
      WHERE b.payment_status = 'confirmed'
        AND b.booking_date = ?
      ORDER BY a.name ASC, b.time_slot ASC`,
    [date]
  );
}

function summarizeByArena(rows: DigestBookingRow[]): DigestArenaSummary[] {
  const map = new Map<string, DigestArenaSummary>();
  for (const r of rows) {
    const existing = map.get(r.arena_name) || { arena_name: r.arena_name, count: 0, revenue: 0 };
    existing.count += 1;
    existing.revenue += Number(r.amount);
    map.set(r.arena_name, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

/** Sends the 8pm IST digest to super admins/accountants (all turfs) and to
 * each arena's managers (their own turf only). */
export async function sendDailyDigest() {
  const todayDate = istDateString(0);
  const tomorrowDate = istDateString(1);

  const [todayBookings, tomorrowBookings] = await Promise.all([
    getBookingsForDate(todayDate),
    getBookingsForDate(tomorrowDate),
  ]);

  // Global digest — super admins + accountants
  const globalEmail = generateDailyDigestEmail({
    scopeLabel: 'All Turfs',
    todayDate,
    tomorrowDate,
    todaySummary: summarizeByArena(todayBookings),
    tomorrowSummary: summarizeByArena(tomorrowBookings),
    todayBookings,
    tomorrowBookings,
  });

  const [superAdmins, accountants] = await Promise.all([
    query<{ email: string }>(`SELECT email FROM super_admins WHERE is_active = true`),
    query<{ email: string }>(`SELECT email FROM accountants WHERE is_active = true`),
  ]);

  for (const recipient of [...superAdmins, ...accountants]) {
    try {
      await sendEmail({ to: recipient.email, ...globalEmail });
    } catch (err) {
      reportServerError(err, { route: 'daily-digest-cron', step: 'send_global', recipient: recipient.email });
    }
  }

  // Per-arena digest — that arena's managers only
  const arenas = await query<{ id: number; name: string }>(`SELECT id, name FROM arenas WHERE status = 'active'`);
  for (const arena of arenas) {
    const arenaAdmins = await query<{ email: string }>(
      `SELECT email FROM arena_admins WHERE arena_id = ? AND is_active = true`,
      [arena.id]
    );
    if (arenaAdmins.length === 0) continue;

    const arenaToday = todayBookings.filter((b) => b.arena_name === arena.name);
    const arenaTomorrow = tomorrowBookings.filter((b) => b.arena_name === arena.name);
    const arenaEmail = generateDailyDigestEmail({
      scopeLabel: arena.name,
      todayDate,
      tomorrowDate,
      todaySummary: summarizeByArena(arenaToday),
      tomorrowSummary: summarizeByArena(arenaTomorrow),
      todayBookings: arenaToday,
      tomorrowBookings: arenaTomorrow,
    });

    for (const recipient of arenaAdmins) {
      try {
        await sendEmail({ to: recipient.email, ...arenaEmail });
      } catch (err) {
        reportServerError(err, { route: 'daily-digest-cron', step: 'send_arena', arenaId: arena.id, recipient: recipient.email });
      }
    }
  }
}

let started = false;

/** Registers the 8:00 PM IST daily digest job. Guarded to start once per
 * server process (see lib/refund-cron.ts for the same pattern). */
export function startDailyDigestCron() {
  if (started) return;
  started = true;

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

  console.info('[daily-digest-cron] Scheduled daily booking digest for 8:00 PM IST.');
}
