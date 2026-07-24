/**
 * POST /api/fg-admin/super-admin/refund
 *
 * Super Admin ONLY — bypasses all time rules and issues a refund
 * with the standard 5% handling fee deducted.
 *
 * Body: { ref: string, notes?: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { readSuperAdminId } from '@/lib/session';
import { query } from '@/lib/domain';
import { logAuditAction } from '@/lib/super-admin';
import { calculateRefundAmount } from '@/lib/refund-policy';
import { z } from 'zod';

const schema = z.object({
  ref: z.string().min(1),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const superAdminId = await readSuperAdminId();
    if (!superAdminId) {
      return NextResponse.json({ success: false, message: 'Unauthorized — Super Admin only' }, { status: 401 });
    }

    const payload = schema.parse(await req.json());

    const bookings = await query<any>(
      `SELECT * FROM bookings WHERE booking_ref = ? LIMIT 10`,
      [payload.ref]
    );

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    const firstBooking = bookings[0];
    if (firstBooking.payment_status === 'cancelled') {
      return NextResponse.json({ success: false, message: 'Booking is already cancelled' }, { status: 400 });
    }

    // Calculate refund with 5% handling fee — no time check, super admin bypasses
    const grossAmount = bookings.reduce((sum: number, b: any) => sum + Number(b.amount), 0);
    const { serviceFee, refundAmount } = calculateRefundAmount(grossAmount);

    await query(
      `UPDATE bookings
          SET payment_status = 'cancelled',
              refund_amount = ?,
              cancellation_requested = FALSE,
              cancellation_reason = ?,
              updated_at = NOW()
        WHERE booking_ref = ?`,
      [
        refundAmount,
        `Super Admin Refund${payload.notes ? ': ' + payload.notes : ''}`,
        payload.ref,
      ]
    );

    // Audit log
    await logAuditAction(
      superAdminId,
      'FORCE_REFUND',
      'booking',
      undefined,
      { ref: payload.ref, grossAmount, serviceFee, refundAmount, notes: payload.notes },
      req.headers.get('x-forwarded-for') || 'unknown',
      req.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({
      success: true,
      message: `Refund of ₹${refundAmount} processed (₹${serviceFee} handling fee deducted from ₹${grossAmount}).`,
      grossAmount,
      serviceFee,
      refundAmount,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'Invalid input', errors: err.errors }, { status: 400 });
    }
    console.error('[Super Admin Refund Error]', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
