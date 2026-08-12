/**
 * POST /api/fg-admin/super-admin/refund
 *
 * Super Admin ONLY — bypasses all time rules and issues a refund
 * with the standard 5% handling fee deducted.
 *
 * Requirement Checklist:
 *  1. Super Admin can override the 3-hour rule.
 *  2. Super Admin can issue refunds even after the cutoff.
 *  3. Even overridden refunds deduct 5% handling fees (Refund Amount = Original - 5%).
 *  4. Every override MUST:
 *      - Require a reason.
 *      - Be stored in audit logs.
 */
import { NextRequest, NextResponse } from 'next/server';
import { readSuperAdminId } from '@/lib/session';
import { query, ensureSchemaColumns, getRefundPolicyConfig } from '@/lib/domain';
import { logAuditAction } from '@/lib/super-admin';
import { calculateRefundAmount } from '@/lib/refund-policy';
import { initiatePayuRefund } from '@/lib/payment';
import { issueCreditNote } from '@/lib/gst-documents';
import { z } from 'zod';

const schema = z.object({
  ref: z.string().min(1, 'Booking reference is required'),
  reason: z.string().min(3, 'A valid reason for the refund override is required'),
});

export async function POST(req: NextRequest) {
  try {
    const superAdminId = await readSuperAdminId();
    if (!superAdminId) {
      return NextResponse.json({ success: false, message: 'Unauthorized — Super Admin only' }, { status: 401 });
    }

    const payload = schema.parse(await req.json());

    await ensureSchemaColumns();

    const bookings = await query<any>(
      `SELECT * FROM bookings WHERE booking_ref = ? LIMIT 10`,
      [payload.ref]
    );

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    const firstBooking = bookings[0];
    console.log('[REFUND API PAYMENT_STATUS CHECK]', firstBooking.booking_ref, '-> payment_status:', firstBooking.payment_status);
    if (firstBooking.payment_status === 'cancelled') {
      return NextResponse.json({ success: false, message: 'Refund already processed for this booking (idempotent block)' }, { status: 400 });
    }
    if (firstBooking.payment_status !== 'confirmed') {
      return NextResponse.json({ success: false, message: 'Only confirmed bookings can be refunded' }, { status: 400 });
    }

    // Offline (pay-at-venue) bookings never go through PayU — there's no
    // payu_mihpayid and, if nothing was collected yet, nothing to refund at all.
    const isOfflineBooking = firstBooking.payment_method === 'offline';
    const wasVenuePaymentCollected = isOfflineBooking && firstBooking.venue_payment_status === 'PAID';

    if (isOfflineBooking && !wasVenuePaymentCollected) {
      const updatedRows = await query<any>(
        `UPDATE bookings
            SET payment_status = 'cancelled',
                refund_status = 'NOT_APPLICABLE',
                refund_amount = 0,
                cancellation_requested = FALSE,
                cancellation_reason = ?,
                updated_at = NOW()
          WHERE booking_ref = ? AND payment_status = 'confirmed'
          RETURNING id`,
        [`Super Admin Override: ${payload.reason}`, payload.ref]
      );

      if (!updatedRows || updatedRows.length === 0) {
        return NextResponse.json({ success: false, message: 'Refund already processed or booking is not in confirmed state (idempotent block)' }, { status: 400 });
      }

      await logAuditAction(
        superAdminId,
        'FORCE_REFUND',
        'booking',
        firstBooking.id,
        { ref: payload.ref, note: 'Offline booking with no venue payment collected — nothing to refund', overrideReason: payload.reason },
        req.headers.get('x-forwarded-for') || 'unknown',
        req.headers.get('user-agent') || 'unknown'
      );

      // No-op if no invoice exists (the expected case here), but defensively
      // correct if one somehow does.
      await issueCreditNote(payload.ref, 0, `Super Admin Override: ${payload.reason}`);

      return NextResponse.json({
        success: true,
        message: 'Booking cancelled. No payment had been collected at the venue, so no refund is due.',
        grossAmount: 0,
        serviceFee: 0,
        refundAmount: 0,
        overrideReason: payload.reason,
      });
    }

    // Calculate refund using active policy configuration for combined BookingGroup amount
    const refundPolicyConfig = await getRefundPolicyConfig();
    await ensureSchemaColumns();
    const grossAmount = bookings.reduce((sum: number, b: any) => sum + Number(b.amount), 0);
    const { serviceFee, refundAmount, feeMode, feeValue } = calculateRefundAmount(grossAmount, refundPolicyConfig);

    // Atomically transition payment_status from 'confirmed' to 'cancelled'
    const updatedRows = await query<any>(
      `UPDATE bookings
          SET payment_status = 'cancelled',
              refund_status = 'INITIATED',
              refund_amount = ?,
              cancellation_requested = FALSE,
              cancellation_reason = ?,
              updated_at = NOW()
        WHERE booking_ref = ? AND payment_status = 'confirmed'
        RETURNING id`,
      [
        refundAmount,
        `Super Admin Override: ${payload.reason}`,
        payload.ref,
      ]
    );

    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json({ success: false, message: 'Refund already processed or booking is not in confirmed state (idempotent block)' }, { status: 400 });
    }

    // Offline bookings never touched PayU, so there's no transaction to refund
    // through the gateway — the venue must return the cash/UPI payment manually.
    const payuResult = wasVenuePaymentCollected
      ? {
          success: false,
          environmentLimitation: false,
          message: 'Offline booking — no PayU transaction exists. Venue must manually return the payment collected at check-in.',
          refundRequestId: null,
          payuTxnId: null,
        }
      : await initiatePayuRefund({
          bookingRef: payload.ref,
          mihpayid: firstBooking.payu_mihpayid,
          amount: refundAmount,
          reason: payload.reason,
        });

    // Log audit action with Super Admin actor identity
    await logAuditAction(
      superAdminId,
      'FORCE_REFUND',
      'booking',
      firstBooking.id,
      {
        ref: payload.ref,
        grossAmount,
        serviceFee,
        refundAmount,
        overrideReason: payload.reason,
        payuTxnId: payuResult.payuTxnId,
        payuRefundRequestId: payuResult.refundRequestId,
        payuResponseStatus: payuResult.success ? 'SUCCESS' : (payuResult.environmentLimitation ? 'ENV_LIMITATION' : 'FAILED'),
      },
      req.headers.get('x-forwarded-for') || 'unknown',
      req.headers.get('user-agent') || 'unknown'
    );

    // Persist PayU refund request id and set non-final refund status for the BookingGroup rows
    try {
      const targetStatus = payuResult.success ? 'PROCESSING' : 'PENDING_REVIEW';
      await query(`UPDATE bookings SET payu_refund_request_id = ?, refund_status = ?, refund_reviewed_at = NOW(), refund_reviewed_by = ? WHERE booking_ref = ?`, [
        payuResult.refundRequestId || null,
        targetStatus,
        superAdminId,
        payload.ref,
      ]);
    } catch (err) {
      console.error('Failed to persist payu_refund_request_id for booking_ref', payload.ref, err);
    }

    // Invoice-at-payment means a Tax Invoice normally already exists for
    // this booking — issue a Credit Note reversing it. No-ops if no invoice
    // exists (shouldn't happen for a 'confirmed' booking, but never blocks
    // the refund itself).
    await issueCreditNote(payload.ref, refundAmount, `Super Admin Override: ${payload.reason}`);

    return NextResponse.json({
      success: true,
      message: `Refund of ₹${refundAmount} processed (₹${serviceFee} 5% fee deducted from ₹${grossAmount}). Reason: "${payload.reason}".`,
      grossAmount,
      serviceFee,
      refundAmount,
      overrideReason: payload.reason,
      payuRefundDetails: {
        refundRequestId: payuResult.refundRequestId,
        payuTxnId: payuResult.payuTxnId,
        payuSuccess: payuResult.success,
        environmentLimitation: payuResult.environmentLimitation,
        payuMessage: payuResult.message,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'Invalid input', errors: err.errors }, { status: 400 });
    }
    console.error('[Super Admin Refund Error]', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
