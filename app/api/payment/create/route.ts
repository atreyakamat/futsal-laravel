import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getBookingsByRef } from '@/lib/domain';
import { getPayuConfig, generatePayuHash, getEnforcePaymethod } from '@/lib/payment';
import { readRequestOrigin } from '@/lib/session';

const bodySchema = z.object({
  booking_ref: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const isJson = request.headers.get('content-type')?.includes('application/json');
    const payload = bodySchema.parse(
      isJson ? await request.json() : Object.fromEntries((await request.formData()).entries())
    );

    const bookings = await getBookingsByRef(payload.booking_ref);
    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    const firstBooking = bookings[0];
    if (firstBooking.payment_status === 'confirmed') {
      return NextResponse.json({ success: false, message: 'Booking already paid' }, { status: 400 });
    }

    const totalAmount = bookings.reduce((sum, b) => sum + Number(b.amount), 0);
    const origin = await readRequestOrigin();
    const { merchantKey, payuUrl } = getPayuConfig();

    const payuParams = {
      txnid: payload.booking_ref,
      amount: totalAmount.toFixed(2),
      productinfo: `Agnel Arena Booking: ${payload.booking_ref}`,
      firstname: firstBooking.customer_name,
      email: firstBooking.customer_email || 'test@example.com',
      phone: firstBooking.customer_mobile,
      surl: `${origin}/api/payment/callback`,
      furl: `${origin}/api/payment/callback`,
      // Enforce allowed payment modes per business rules
      enforce_paymethod: getEnforcePaymethod(),
    };

    const hash = generatePayuHash(payuParams);

    return NextResponse.json({
      success: true,
      payuUrl,
      hash,
      key: merchantKey,
      params: payuParams,
    });
  } catch (error) {
    console.error('Payment create error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'Invalid input', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
