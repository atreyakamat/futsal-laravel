import { NextResponse } from 'next/server';
import { confirmPayment, markPaymentFailed } from '@/lib/domain';
import { verifyPayuResponseHash } from '@/lib/payment';

async function readFormValue(request: Request, key: string) {
  const formData = await request.formData();
  return String(formData.get(key) ?? '');
}

export async function POST(request: Request) {
  const status = await readFormValue(request, 'status');
  const bookingRef = await readFormValue(request, 'txnid');
  const mihpayid = await readFormValue(request, 'mihpayid');
  const amount = await readFormValue(request, 'amount');
  const productinfo = await readFormValue(request, 'productinfo');
  const firstname = await readFormValue(request, 'firstname');
  const email = await readFormValue(request, 'email');
  const hash = await readFormValue(request, 'hash');

  if (!bookingRef) {
    return NextResponse.json({ success: false, message: 'txnid is required.' }, { status: 400 });
  }

  if (status === 'success') {
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
      return NextResponse.json({ success: false, message: 'Invalid payment signature.' }, { status: 400 });
    }

    const booking = await confirmPayment(bookingRef, mihpayid || null);
    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found.' }, { status: 404 });
    }

    return NextResponse.redirect(new URL(`/booking/success/${bookingRef}`, request.url));
  }

  await markPaymentFailed(bookingRef);
  return NextResponse.redirect(new URL('/', request.url));
}