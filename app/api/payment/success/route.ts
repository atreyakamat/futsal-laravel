import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getBookingsByRef, confirmPayment } from '@/lib/domain';
import { verifyPayuResponseHash } from '@/lib/payment';
import { sendTicketEmail } from '@/lib/ticket';

const bodySchema = z.object({
  status: z.string(),
  txnid: z.string().min(1),
  amount: z.string(),
  productinfo: z.string(),
  firstname: z.string(),
  email: z.string(),
  hash: z.string(),
  mihpayid: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const payload = bodySchema.parse(await request.json());

    const isValidHash = verifyPayuResponseHash({
      status: payload.status,
      txnid: payload.txnid,
      amount: payload.amount,
      productinfo: payload.productinfo,
      firstname: payload.firstname,
      email: payload.email,
      hash: payload.hash,
    });

    if (!isValidHash) {
      return NextResponse.json({ success: false, message: 'Invalid payment signature' }, { status: 400 });
    }

    if (payload.status !== 'success') {
      return NextResponse.json({ success: false, message: 'Payment was not successful' }, { status: 400 });
    }

    const bookings = await getBookingsByRef(payload.txnid);
    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    if (bookings[0].payment_status === 'confirmed') {
      return NextResponse.json({ success: true, message: 'Already confirmed', duplicate: true });
    }

    const booking = await confirmPayment(payload.txnid, payload.mihpayid || null);
    if (!booking) {
      return NextResponse.json({ success: false, message: 'Failed to confirm payment' }, { status: 500 });
    }

    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;
    await sendTicketEmail(payload.txnid, baseUrl);

    return NextResponse.json({ success: true, message: 'Payment confirmed', bookingRef: payload.txnid });
  } catch (error) {
    console.error('Payment success handler error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'Invalid input', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
