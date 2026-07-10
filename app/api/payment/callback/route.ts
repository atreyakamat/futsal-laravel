import { getBaseUrl } from '@/lib/session';
import { NextResponse } from 'next/server';
import { confirmPayment, markPaymentFailed, getBookingsByRef, query } from '@/lib/domain';
import { verifyPayuResponseHash, verifyPaymentWithPayu } from '@/lib/payment';
import { sendTicketEmail } from '@/lib/ticket';

export async function POST(request: Request) {
  try {
    const baseUrl = getBaseUrl(request);
    const formData = await request.formData();
    const status = String(formData.get('status') ?? '');
    const bookingRef = String(formData.get('txnid') ?? '');
    const mihpayid = String(formData.get('mihpayid') ?? '');
    const amount = String(formData.get('amount') ?? '');
    const productinfo = String(formData.get('productinfo') ?? '');
    const firstname = String(formData.get('firstname') ?? '');
    const email = String(formData.get('email') ?? '');
    const hash = String(formData.get('hash') ?? '');
    const additionalCharges = formData.has('additionalCharges') ? String(formData.get('additionalCharges')) : null;

    if (!bookingRef) {
      return NextResponse.json({ success: false, message: 'txnid is required.' }, { status: 400 });
    }

    // Force signature verification for all transaction statuses
    const isValidHash = verifyPayuResponseHash({
      status,
      txnid: bookingRef,
      amount,
      productinfo,
      firstname,
      email,
      hash,
      additionalCharges,
    });

    if (!isValidHash) {
      await markPaymentFailed(bookingRef);
      return NextResponse.redirect(new URL(`/booking/payment-failed/${bookingRef}`, baseUrl), 303);
    }

    // Load bookings and verify existence
    const bookings = await getBookingsByRef(bookingRef);
    if (!bookings || bookings.length === 0) {
      return NextResponse.redirect(new URL(`/`, baseUrl), 303);
    }

    // Log the callback details to payment_audit_logs
    try {
      const payloadJson = JSON.stringify(Object.fromEntries(formData.entries()));
      await query(
        `INSERT INTO payment_audit_logs (booking_ref, status, amount, mihpayid, payload, created_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [bookingRef, status, Number(amount) || 0, mihpayid || null, payloadJson]
      );
    } catch (logError) {
      console.error('Failed to log payment audit:', logError);
    }

    // Callback idempotency checking
    const currentStatus = bookings[0].payment_status;
    if (currentStatus === 'confirmed') {
      return NextResponse.redirect(new URL(`/booking/success/${bookingRef}`, baseUrl), 303);
    }
    if (currentStatus === 'failed') {
      return NextResponse.redirect(new URL(`/booking/payment-failed/${bookingRef}`, baseUrl), 303);
    }

    if (status === 'success') {
      // Double check status using the postservice API
      const verificationDetails = await verifyPaymentWithPayu(bookingRef);
      if (verificationDetails === null) {
        // Postservice API itself failed (network/timeout) — trust the hash-verified callback
        console.warn('PayU postservice API returned null for txnid:', bookingRef, '— trusting hash-verified callback and confirming payment.');
      } else if (verificationDetails.status !== 'success') {
        // PayU explicitly returned a non-success status — reject
        console.error('PayU postservice verification returned non-success for txnid:', bookingRef, 'status:', verificationDetails.status);
        await markPaymentFailed(bookingRef);
        return NextResponse.redirect(new URL(`/booking/payment-failed/${bookingRef}`, baseUrl), 303);
      }

      const booking = await confirmPayment(bookingRef, mihpayid || null);
      if (!booking) {
        return NextResponse.redirect(new URL(`/booking/payment-failed/${bookingRef}`, baseUrl), 303);
      }

      await sendTicketEmail(bookingRef);

      return NextResponse.redirect(new URL(`/booking/success/${bookingRef}`, baseUrl), 303);
    }

    // Mark failed
    await markPaymentFailed(bookingRef);
    return NextResponse.redirect(new URL(`/booking/payment-failed/${bookingRef}`, baseUrl), 303);
  } catch (error) {
    console.error('Payment callback handler error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}