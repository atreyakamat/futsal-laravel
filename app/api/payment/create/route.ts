import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getBookingsByRef, query } from '@/lib/domain';
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
      // `example.com` is an IANA-reserved documentation-only domain — sending
      // it to a live payment gateway is a classic bot/test-traffic signal
      // that fraud/WAF filters commonly block outright. Fall back to a real,
      // merchant-owned domain instead when the customer didn't supply an email.
      email: firstBooking.customer_email || `guest-${payload.booking_ref}@agnelarenagoa.com`,
      phone: firstBooking.customer_mobile,
      surl: `${origin}/api/payment/callback`,
      furl: `${origin}/api/payment/callback`,
      // Enforce allowed payment modes per business rules
      enforce_paymethod: getEnforcePaymethod(),
    };

    const hash = generatePayuHash(payuParams);

    // Log the outgoing request BEFORE the client redirects to PayU — see
    // the matching comment in app/payment/checkout/[ref]/page.tsx for why
    // (a request PayU rejects before processing, e.g. a gateway-level
    // "Too many Requests" block, otherwise leaves zero trace on our side).
    // Never includes PAYU_MERCHANT_SALT — that's not part of `payuParams`.
    try {
      await query(
        `INSERT INTO payment_audit_logs (booking_ref, status, amount, mihpayid, payload, created_at)
         VALUES (?, 'initiated', ?, NULL, ?, NOW())`,
        [
          payload.booking_ref,
          totalAmount,
          JSON.stringify({
            gateway_url: payuUrl,
            merchant_key: merchantKey,
            txnid: payuParams.txnid,
            amount: payuParams.amount,
            email: payuParams.email,
            phone: payuParams.phone,
            firstname: payuParams.firstname,
            productinfo: payuParams.productinfo,
            enforce_paymethod: payuParams.enforce_paymethod,
          }),
        ]
      );
    } catch (e) {
      console.error('Failed to write payment initiation audit log:', e);
    }

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
