import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { query, queryOne, getBookingsByRef } from '@/lib/domain';
import { logAuditAction } from '@/lib/super-admin';

const bodySchema = z.object({
  bookingRef: z.string(),
  gatewayId: z.string(),
  reason: z.string().optional(),
});

const PAYMENT_WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || '';

export async function POST(request: Request) {
  try {
    const signature = request.headers.get('x-payment-signature');
    const rawBody = await request.text();

    // HMAC verification
    if (!signature || !PAYMENT_WEBHOOK_SECRET) {
      return NextResponse.json(
        { success: false, message: 'Invalid signature' },
        { status: 400 }
      );
    }

    const expected = crypto
      .createHmac('sha256', PAYMENT_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return NextResponse.json(
        { success: false, message: 'Invalid signature' },
        { status: 400 }
      );
    }

    const payload = bodySchema.parse(JSON.parse(rawBody));
    const { bookingRef, gatewayId, reason } = payload;

    // Idempotency check
    const existing = await queryOne<{ id: number }>(
      'SELECT id FROM payment_callbacks WHERE gateway_id = ? LIMIT 1',
      [gatewayId]
    );

    if (existing) {
      return NextResponse.json({ success: true, duplicate: true });
    }

    // Verify booking exists
    const bookings = await getBookingsByRef(bookingRef);
    if (!bookings || bookings.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Booking not found' },
        { status: 404 }
      );
    }

    // Mark booking as failed
    await query(
      'UPDATE bookings SET payment_status = ?, updated_at = NOW() WHERE booking_ref = ?',
      ['failed', bookingRef]
    );

    // Release any slot locks for this booking
    const booking = bookings[0];
    if (booking) {
      await query(
        'DELETE FROM slot_locks WHERE arena_id = ? AND booking_date = ?',
        [booking.arena_id, booking.booking_date]
      );
    }

    // Record callback for idempotency
    await query(
      `INSERT INTO payment_callbacks (booking_ref, gateway_id, status, raw_payload) VALUES (?, ?, 'failed', ?)`,
      [bookingRef, gatewayId, JSON.stringify(payload)]
    );

    // Audit log
    await logAuditAction(
      0,
      'payment_failed',
      'booking',
      undefined,
      { bookingRef, gatewayId, reason }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Payment failure callback error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}