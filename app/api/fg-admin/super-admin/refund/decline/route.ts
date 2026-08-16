/**
 * POST /api/fg-admin/super-admin/refund/decline
 *
 * Super Admin ONLY — declines a refund for a cancelled booking. The
 * cancellation itself already stands (the slot was freed the moment the
 * customer requested it — see app/api/bookings/cancel/route.ts); this only
 * decides that no money goes back. No PayU call, no Credit Note (nothing
 * was refunded, so the original Tax Invoice stands as-is).
 *
 * Only allowed while refund_status is still PENDING_REVIEW — the review
 * gate a cancellation sits in until a super admin acts on it one way or
 * the other. Once declined, it's terminal (REJECTED) and this endpoint
 * won't act on it again.
 */
import { NextRequest, NextResponse } from 'next/server';
import { readSuperAdminId } from '@/lib/session';
import { query } from '@/lib/domain';
import { logAuditAction } from '@/lib/super-admin';
import { reportServerError } from '@/lib/error-log';
import { z } from 'zod';

const schema = z.object({
  ref: z.string().min(1, 'Booking reference is required'),
  reason: z.string().min(3, 'A reason is required to decline a refund'),
});

export async function POST(req: NextRequest) {
  try {
    const superAdminId = await readSuperAdminId();
    if (!superAdminId) {
      return NextResponse.json({ success: false, message: 'Unauthorized — Super Admin only' }, { status: 401 });
    }

    const payload = schema.parse(await req.json());

    const firstBooking = await query<any>(`SELECT id FROM bookings WHERE booking_ref = ? LIMIT 1`, [payload.ref]);
    if (!firstBooking || firstBooking.length === 0) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    const updatedRows = await query<{ id: number }>(
      `UPDATE bookings
          SET refund_status = 'REJECTED',
              refund_amount = 0,
              refund_reviewed_at = NOW(),
              refund_reviewed_by = ?,
              cancellation_reason = ?,
              updated_at = NOW()
        WHERE booking_ref = ?
          AND refund_status = 'PENDING_REVIEW'
        RETURNING id`,
      [superAdminId, `Refund Declined: ${payload.reason}`, payload.ref]
    );

    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'This refund is no longer pending review (already processed or declined).' },
        { status: 400 }
      );
    }

    await logAuditAction(
      superAdminId,
      'DECLINE_REFUND',
      'booking',
      firstBooking[0].id,
      { ref: payload.ref, reason: payload.reason },
      req.headers.get('x-forwarded-for') || 'unknown',
      req.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({
      success: true,
      message: `Refund declined for ${payload.ref}. Reason: "${payload.reason}".`,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'Invalid input', errors: err.errors }, { status: 400 });
    }
    reportServerError(err, { route: 'super-admin/refund/decline' });
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
