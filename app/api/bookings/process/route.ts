import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createBookingBatch, releaseLocks } from '@/lib/domain';
import { getCookieValueFromRequest, getWritableSessionId, persistSessionCookie, AUTH_COOKIE, signValue, readAuthUserId, getCookieOptions } from '@/lib/session';
import { getArenaEntryMode } from '@/lib/admin';
import { sendTicketEmail } from '@/lib/ticket';
import { verifyCsrfMiddleware } from '@/lib/csrf-middleware';
import { normalizePhoneNumber } from '@/lib/phone';

const bodySchema = z.object({
  arena_id: z.number().int().positive(),
  date: z.string().min(10),
  slots: z.array(z.string().min(1)).min(1),
  customer_name: z.string().min(1).max(100),
  customer_mobile: z.string().min(5).max(15),
  customer_email: z.string().email().nullable().optional(),
});

async function readPayload(request: Request) {
  const isJson = request.headers.get('content-type')?.includes('application/json');

  if (isJson) {
    return { isJson, raw: await request.json() };
  }

  const formData = await request.formData();
  return { isJson, raw: Object.fromEntries(formData.entries()) };
}

export async function POST(request: Request) {
  const csrfError = await verifyCsrfMiddleware(request);
  if (csrfError) return csrfError;
  const { isJson, raw } = await readPayload(request);
  const payloadObject = raw as Record<string, string | string[]>;
  const slots = Array.isArray(payloadObject.slots)
    ? payloadObject.slots
    : typeof payloadObject.slots === 'string' && payloadObject.slots.startsWith('[')
      ? (JSON.parse(payloadObject.slots) as string[])
      : typeof payloadObject.slots === 'string'
        ? [payloadObject.slots]
        : [];

  const payload = bodySchema.parse({
    arena_id: Number(payloadObject.arena_id),
    date: String(payloadObject.date),
    slots,
    customer_name: String(payloadObject.customer_name),
    customer_mobile: normalizePhoneNumber(String(payloadObject.customer_mobile)),
    customer_email: payloadObject.customer_email ? String(payloadObject.customer_email) : null,
  });

  const sessionId = getWritableSessionId(request);
  const authUserId = await readAuthUserId();
  const entryMode = await getArenaEntryMode(payload.arena_id);

  if (entryMode === 'blocked') {
    return NextResponse.json({ success: false, message: 'This arena is temporarily blocked for bookings.' }, { status: 403 });
  }

  let result;
  try {
    result = await createBookingBatch({
      arenaId: payload.arena_id,
      bookingDate: payload.date,
      slots: payload.slots,
      customerName: payload.customer_name,
      customerMobile: payload.customer_mobile,
      customerEmail: payload.customer_email ?? null,
      userId: authUserId,
      sessionId,
      freeBooking: entryMode === 'free',
    });
  } catch (error) {
    console.error('[Booking Process Error]:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process booking.';
    
    // Release locks in case of failure
    await releaseLocks(sessionId, payload.arena_id, payload.date, payload.slots);
    
    if (isJson) {
      return NextResponse.json({ success: false, message: errorMessage }, { status: 400 });
    }
    
    const referer = request.headers.get('referer') || `/booking/checkout?arena_id=${payload.arena_id}&date=${payload.date}&slots=${encodeURIComponent(JSON.stringify(payload.slots))}`;
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;
    const url = new URL(referer, baseUrl);
    url.searchParams.set('error', errorMessage);
    return NextResponse.redirect(url, 303);
  }

  await releaseLocks(sessionId, payload.arena_id, payload.date, payload.slots);

  if (entryMode === 'free') {
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const dynamicBaseUrl = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;
    await sendTicketEmail(result.bookingRef, dynamicBaseUrl);
  }

  const redirectTarget = entryMode === 'free'
    ? `/booking/success/${result.bookingRef}`
    : `/payment/checkout/${result.bookingRef}`;

  const proto = request.headers.get('x-forwarded-proto') || 'http';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;
  const response = isJson
    ? NextResponse.json({
        success: true,
        bookingRef: result.bookingRef,
        redirectTo: redirectTarget,
      })
    : NextResponse.redirect(new URL(redirectTarget, baseUrl), 303);

  const cookieOpts = getCookieOptions();
  if (result.userId) {
    response.cookies.set(AUTH_COOKIE, await signValue(String(result.userId)), cookieOpts);
    response.cookies.delete('fg_guest_identifier');
  }

  response.cookies.set('fg_last_booking_ref', result.bookingRef, cookieOpts);

  persistSessionCookie(response, sessionId);
  return response;
}