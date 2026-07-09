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
    });

    if (!isValidHash) {
      await markPaymentFailed(bookingRef);
      return NextResponse.redirect(new URL(`/booking/payment-failed/${bookingRef}`, baseUrl));
    }

    // Load bookings and verify existence
    const bookings = await getBookingsByRef(bookingRef);
    if (!bookings || bookings.length === 0) {
      return NextResponse.redirect(new URL(`/`, baseUrl));
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
      return NextResponse.redirect(new URL(`/booking/success/${bookingRef}`, baseUrl));
    }
    if (currentStatus === 'failed') {
      return NextResponse.redirect(new URL(`/booking/payment-failed/${bookingRef}`, baseUrl));
    }

    if (status === 'success') {
      // Double check status using the postservice API as requested
      const verificationDetails = await verifyPaymentWithPayu(bookingRef);
      if (!verificationDetails || verificationDetails.status !== 'success') {
        console.error('PayU postservice verification failed or returned non-success for txnid:', bookingRef);
        return NextResponse.redirect(new URL(`/booking/payment-failed/${bookingRef}`, baseUrl));
      }

      const booking = await confirmPayment(bookingRef, mihpayid || null);
      if (!booking) {
        return NextResponse.redirect(new URL(`/booking/payment-failed/${bookingRef}`, baseUrl));
      }

      await sendTicketEmail(bookingRef);

      return NextResponse.redirect(new URL(`/booking/success/${bookingRef}`, baseUrl));
    }

    // Mark failed
    await markPaymentFailed(bookingRef);
    return NextResponse.redirect(new URL(`/booking/payment-failed/${bookingRef}`, baseUrl));
  } catch (error) {
    console.error('Payment callback handler error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}