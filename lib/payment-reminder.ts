import { getBookingsByRef, getArenaById } from '@/lib/domain';
import { sendEmail, generatePendingPaymentEmail, generatePaymentReminderEmail } from '@/lib/email';
import { getSmsProvider } from '@/lib/sms';
import { mergeSlots } from '@/lib/slot-merge';

function buildLoginUrl(appUrl: string, bookingRef: string): string {
  const base = appUrl.replace(/\/$/, '');
  return `${base}/login?next=${encodeURIComponent(`/payment/checkout/${bookingRef}`)}`;
}

/**
 * Sent once, right when staff book a slot on a customer's behalf and leave
 * it 'pending' — see app/api/fg-admin/platform/bookings/route.ts, the only
 * caller. Email only (no WhatsApp) per the brief for this one-time notice;
 * the 1-hour-before nudge (sendPaymentReminder, below) is both channels.
 */
export async function sendPendingPaymentEmail(bookingRef: string, appUrl?: string) {
  const bookings = await getBookingsByRef(bookingRef);
  const firstBooking = bookings?.[0];
  if (!firstBooking) return { sent: false, reason: 'Booking not found' as const };
  if (!firstBooking.customer_email) return { sent: false, reason: 'No customer email' as const };

  const arena = await getArenaById(firstBooking.arena_id);
  if (!arena) return { sent: false, reason: 'Arena not found' as const };

  const baseUrl = (appUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://agnelarenagoa.com').replace(/\/$/, '');
  const loginUrl = buildLoginUrl(baseUrl, bookingRef);
  const totalAmount = bookings.reduce((sum, b) => sum + Number(b.amount), 0);

  const { subject, html, text } = generatePendingPaymentEmail(
    bookingRef,
    arena.name,
    arena.address || '',
    firstBooking.booking_date,
    bookings.map((b) => b.time_slot),
    firstBooking.customer_name,
    totalAmount,
    loginUrl
  );

  const result = await sendEmail({ to: firstBooking.customer_email, subject, html, text });
  return { sent: result.success, error: result.error };
}

/**
 * Sent ~1 hour before a still-unpaid staff-created booking's slot starts —
 * see lib/payment-reminder-cron.ts, the only caller. Both channels: email
 * and WhatsApp (PAYMENT_REMINDER — see lib/sms.ts's AiSensyProvider; it
 * no-ops with a clear log if no approved template is configured yet via
 * AISENSY_CAMPAIGN_NAME_PAYMENT_REMINDER).
 */
export async function sendPaymentReminder(bookingRef: string, appUrl?: string) {
  const bookings = await getBookingsByRef(bookingRef);
  const firstBooking = bookings?.[0];
  if (!firstBooking) return { emailSent: false, whatsappSent: false, reason: 'Booking not found' as const };

  const arena = await getArenaById(firstBooking.arena_id);
  if (!arena) return { emailSent: false, whatsappSent: false, reason: 'Arena not found' as const };

  const baseUrl = (appUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://agnelarenagoa.com').replace(/\/$/, '');
  const loginUrl = buildLoginUrl(baseUrl, bookingRef);
  const totalAmount = bookings.reduce((sum, b) => sum + Number(b.amount), 0);
  const rawSlots = bookings.map((b) => b.time_slot);

  let emailSent = false;
  if (firstBooking.customer_email) {
    try {
      const { subject, html, text } = generatePaymentReminderEmail(
        bookingRef,
        arena.name,
        arena.address || '',
        firstBooking.booking_date,
        rawSlots,
        firstBooking.customer_name,
        totalAmount,
        loginUrl
      );
      const result = await sendEmail({ to: firstBooking.customer_email, subject, html, text });
      emailSent = result.success;
    } catch (err) {
      console.error('[PaymentReminder] Email send failed:', err);
    }
  }

  let whatsappSent = false;
  if (firstBooking.customer_mobile) {
    try {
      const provider = getSmsProvider();
      const timeRange = mergeSlots(rawSlots).join(', ');
      whatsappSent = await provider.sendSms(
        firstBooking.customer_mobile,
        `PAYMENT_REMINDER|${firstBooking.booking_date}|${timeRange}|${bookingRef}|${firstBooking.customer_name}|${totalAmount.toFixed(2)}`,
        { appUrl: baseUrl }
      );
    } catch (err) {
      console.error('[PaymentReminder] WhatsApp send failed:', err);
    }
  }

  return { emailSent, whatsappSent };
}
