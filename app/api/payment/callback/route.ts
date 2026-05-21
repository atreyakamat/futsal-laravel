import { NextResponse } from 'next/server';
import { confirmPayment, markPaymentFailed } from '@/lib/domain';

async function readFormValue(request: Request, key: string) {
  const formData = await request.formData();
  return String(formData.get(key) ?? '');
}

export async function POST(request: Request) {
  const status = await readFormValue(request, 'status');
  const bookingRef = await readFormValue(request, 'txnid');
  const mihpayid = await readFormValue(request, 'mihpayid');

  if (!bookingRef) {
    return NextResponse.json({ success: false, message: 'txnid is required.' }, { status: 400 });
  }

  if (status === 'success') {
    const booking = await confirmPayment(bookingRef, mihpayid || null);
    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found.' }, { status: 404 });
    }

    return NextResponse.redirect(new URL(`/booking/success/${bookingRef}`, request.url));
  }

  await markPaymentFailed(bookingRef);
  return NextResponse.redirect(new URL('/', request.url));
}