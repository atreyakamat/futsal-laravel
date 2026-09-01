import webpush from 'web-push';
import { query, queryOne } from '@/lib/db';
import { reportServerError } from '@/lib/error-log';
import { getBookingsByRef } from '@/lib/domain';
import { getArenaById } from '@/lib/domain';
import { mergeSlots } from '@/lib/slot-merge';

export type PushOwnerType = 'user' | 'super_admin' | 'arena_admin';

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

type SubscriptionRow = { id: number; endpoint: string; p256dh: string; auth: string };

let vapidConfigured = false;

/** Lazily configures web-push with VAPID details — returns false (and never
 * throws) when the keypair isn't set, so every caller in this file can just
 * no-op instead of crashing a request/cron tick over an unconfigured
 * integration, same "safe to ship before it's configured" pattern as
 * SupportWidget/Sentry elsewhere in this app. */
function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:no-reply@aiemgoa.ac.in',
    publicKey,
    privateKey
  );
  vapidConfigured = true;
  return true;
}

export async function saveSubscription(ownerType: PushOwnerType, ownerId: number, subscription: PushSubscriptionInput) {
  await query(
    `INSERT INTO push_subscriptions (owner_type, owner_id, endpoint, p256dh, auth, created_at)
     VALUES (?, ?, ?, ?, ?, NOW())
     ON CONFLICT (endpoint) DO UPDATE SET owner_type = EXCLUDED.owner_type, owner_id = EXCLUDED.owner_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
    [ownerType, ownerId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
  );
}

export async function removeSubscription(endpoint: string) {
  await query(`DELETE FROM push_subscriptions WHERE endpoint = ?`, [endpoint]);
}

async function getSubscriptions(ownerType: PushOwnerType, ownerIds: number[]): Promise<SubscriptionRow[]> {
  if (ownerIds.length === 0) return [];
  return query<SubscriptionRow>(
    `SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE owner_type = ? AND owner_id = ANY(?)`,
    [ownerType, ownerIds]
  );
}

/**
 * Sends one push payload to a batch of subscription rows. A 404/410 means
 * the browser/OS has permanently invalidated that endpoint (uninstalled,
 * unsubscribed, expired) — web-push's documented signal to delete it rather
 * than keep retrying it forever. Every other failure is logged and
 * otherwise ignored: a push notification is best-effort, never something
 * that should fail the booking request or cron tick that triggered it.
 */
async function sendToSubscriptions(subscriptions: SubscriptionRow[], payload: Record<string, unknown>) {
  if (!ensureVapidConfigured() || subscriptions.length === 0) return;

  const body = JSON.stringify(payload);
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
      } catch (err: any) {
        const statusCode = err?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await removeSubscription(sub.endpoint).catch(() => {});
        } else {
          reportServerError(err, { route: 'push', step: 'send_notification', endpoint: sub.endpoint });
        }
      }
    })
  );
}

/**
 * Notifies every active super_admin, every active platform-wide arena_admin
 * ("admin", arena_id IS NULL), and every active arena_admin scoped to this
 * booking's arena ("manager", arena_id = booking's arena) that a new
 * booking came in. Call this once a booking is actually confirmed — see
 * lib/ticket.ts's sendTicketEmail, the single choke point every booking
 * "become real" path (online payment success/callback, free/offline
 * booking, admin-approved free/discounted booking) already funnels through.
 */
export async function notifyStaffOfNewBooking(bookingRef: string) {
  try {
    if (!ensureVapidConfigured()) return;

    const bookings = await getBookingsByRef(bookingRef);
    const first = bookings?.[0];
    if (!first) return;

    const arena = await getArenaById(first.arena_id);
    const slots = mergeSlots(bookings.map((b) => b.time_slot));

    const [superAdmins, arenaAdmins] = await Promise.all([
      query<{ id: number }>(`SELECT id FROM super_admins WHERE is_active = true`),
      query<{ id: number }>(
        `SELECT id FROM arena_admins WHERE is_active = true AND (arena_id IS NULL OR arena_id = ?)`,
        [first.arena_id]
      ),
    ]);

    const [superAdminSubs, arenaAdminSubs] = await Promise.all([
      getSubscriptions('super_admin', superAdmins.map((a) => a.id)),
      getSubscriptions('arena_admin', arenaAdmins.map((a) => a.id)),
    ]);

    const payload = {
      title: 'New booking received',
      body: `${first.customer_name} booked ${arena?.name ?? 'a turf'} — ${first.booking_date}, ${slots.join(', ')}`,
      url: '/fg-admin/platform/dashboard',
      tag: `booking-${bookingRef}`,
    };

    await sendToSubscriptions([...superAdminSubs, ...arenaAdminSubs], payload);
  } catch (err) {
    reportServerError(err, { route: 'push', step: 'notify_staff_new_booking', bookingRef });
  }
}

/** Sends the "your slot starts soon" push to the customer who made the
 * booking. Called from lib/booking-reminder-cron.ts. */
export async function notifyCustomerOfUpcomingSlot(booking: {
  booking_ref: string;
  user_id: number;
  arena_name: string;
  booking_date: string;
  time_slot: string;
}) {
  try {
    if (!ensureVapidConfigured()) return;

    const subs = await getSubscriptions('user', [booking.user_id]);
    if (subs.length === 0) return;

    const payload = {
      title: 'Your slot starts in 30 minutes',
      body: `${booking.arena_name} — ${booking.time_slot} today. See you on the pitch!`,
      url: `/booking/ticket/${booking.booking_ref}`,
      tag: `reminder-${booking.booking_ref}`,
    };

    await sendToSubscriptions(subs, payload);
  } catch (err) {
    reportServerError(err, { route: 'push', step: 'notify_customer_reminder', bookingRef: booking.booking_ref });
  }
}

export { ensureVapidConfigured };
