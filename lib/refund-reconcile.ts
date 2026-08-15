import { query, queryOne } from '@/lib/db';
import { checkPayuRefundStatus } from '@/lib/payment';
import { sendEmail, generateRefundCompletedEmail } from '@/lib/email';
import { reportServerError } from '@/lib/error-log';

export interface ReconcileResult {
  success: boolean;
  message?: string;
  mapped?: { refund_status: string; payment_status?: string | null; note?: string };
  raw?: { status: string; response: any };
}

/**
 * Polls PayU for the real status of a refund request and applies it to every
 * booking row sharing that payu_refund_request_id. Shared by the admin
 * "Check PayU Status" button and the periodic cron job (lib/refund-cron.ts)
 * so both go through identical mapping/update/email logic rather than two
 * copies drifting apart.
 */
export async function reconcileRefundStatus(refundRequestId: string): Promise<ReconcileResult> {
  const statusRes = await checkPayuRefundStatus(refundRequestId);

  const raw = (statusRes.status || '').toString().toUpperCase();
  let mapped: { refund_status: string; payment_status?: string | null; note?: string } = { refund_status: 'PROCESSING' };

  if (raw.includes('SUCCESS')) {
    mapped = { refund_status: 'REFUNDED', payment_status: 'refunded', note: 'PayU reported SUCCESS' };
  } else if (raw.includes('REQUEST') || raw.includes('REQUESTED')) {
    mapped = { refund_status: 'PENDING_REVIEW', note: 'PayU reported REQUESTED' };
  } else if (raw.includes('IN PROGRESS') || raw.includes('IN_PROGRESS') || raw.includes('PROCESS')) {
    mapped = { refund_status: 'PROCESSING', note: 'PayU reported IN PROGRESS' };
  } else if (raw.includes('REJECT')) {
    mapped = { refund_status: 'REJECTED', note: 'PayU reported REJECTED' };
  } else if (raw.includes('FAIL') || raw.includes('FAILED') || raw.includes('ERROR')) {
    mapped = { refund_status: 'REJECTED', note: 'PayU reported FAILURE' };
  } else {
    mapped = { refund_status: 'PROCESSING', note: `Unknown PayU status: ${statusRes.status}` };
  }

  // Booking rows sharing a booking_ref all carry the same refund_status —
  // find the previous status BEFORE updating, so we only ever send the
  // "refund completed" email on the transition into REFUNDED, never again
  // on a later cron tick that finds it still REFUNDED.
  const before = await queryOne<{ booking_ref: string; refund_status: string | null }>(
    `SELECT booking_ref, refund_status FROM bookings WHERE payu_refund_request_id = ? LIMIT 1`,
    [refundRequestId]
  );
  const wasAlreadyRefunded = before?.refund_status === 'REFUNDED';

  const updated = await query<{ id: number; booking_ref: string }>(
    `UPDATE bookings SET refund_status = ?, refund_processed_at = CASE WHEN ? = 'REFUNDED' THEN NOW() ELSE refund_processed_at END, payment_status = CASE WHEN ? = 'refunded' THEN 'refunded' ELSE payment_status END WHERE payu_refund_request_id = ? RETURNING id, booking_ref`,
    [mapped.refund_status, mapped.refund_status, mapped.payment_status || null, refundRequestId]
  );

  if (mapped.refund_status === 'REFUNDED' && !wasAlreadyRefunded && updated.length > 0) {
    try {
      const bookingRef = updated[0].booking_ref;
      const booking = await queryOne<{
        customer_name: string;
        customer_email: string | null;
        refund_amount: number | null;
        arena_name: string;
      }>(
        `SELECT b.customer_name, b.customer_email, MAX(b.refund_amount) as refund_amount, a.name as arena_name
           FROM bookings b
           JOIN arenas a ON a.id = b.arena_id
          WHERE b.booking_ref = ?
          GROUP BY b.customer_name, b.customer_email, a.name`,
        [bookingRef]
      );
      if (booking?.customer_email) {
        const { subject, html, text } = generateRefundCompletedEmail(
          bookingRef,
          booking.arena_name,
          booking.customer_name,
          Number(booking.refund_amount || 0)
        );
        await sendEmail({ to: booking.customer_email, subject, html, text });
      }
    } catch (err) {
      reportServerError(err, { route: 'refund-reconcile', step: 'send_refund_email', refundRequestId });
    }
  }

  return { success: true, mapped, raw: { status: statusRes.status, response: statusRes.response } };
}

/** Finds every distinct in-flight PayU refund request that hasn't reached a
 * terminal state yet, so the cron job knows what to poll. */
export async function getPendingRefundRequestIds(): Promise<string[]> {
  const rows = await query<{ payu_refund_request_id: string }>(
    `SELECT DISTINCT payu_refund_request_id
       FROM bookings
      WHERE refund_status IN ('PROCESSING', 'INITIATED', 'PENDING_REVIEW')
        AND payu_refund_request_id IS NOT NULL`
  );
  return rows.map((r) => r.payu_refund_request_id);
}
