import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createBookingBatch, releaseLocks } from '@/lib/domain';
import { getCookieValueFromRequest, getWritableSessionId, persistSessionCookie, AUTH_COOKIE } from '@/lib/session';

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
    customer_mobile: String(payloadObject.customer_mobile),
    customer_email: payloadObject.customer_email ? String(payloadObject.customer_email) : null,
  });

  const sessionId = getWritableSessionId(request);
  const authUserId = getCookieValueFromRequest(request, AUTH_COOKIE);

  const result = await createBookingBatch({
    arenaId: payload.arena_id,
    bookingDate: payload.date,
    slots: payload.slots,
    customerName: payload.customer_name,
    customerMobile: payload.customer_mobile,
    customerEmail: payload.customer_email ?? null,
    userId: authUserId ? Number(authUserId) : null,
    sessionId,
  });

  await releaseLocks(sessionId, payload.arena_id, payload.date, payload.slots);

  const response = isJson
    ? NextResponse.json({
        success: true,
        bookingRef: result.bookingRef,
        redirectTo: `/payment/checkout/${result.bookingRef}`,
      })
    : NextResponse.redirect(new URL(`/payment/checkout/${result.bookingRef}`, request.url));

  response.cookies.set('fg_last_booking_ref', result.bookingRef, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });

  persistSessionCookie(response, sessionId);
  return response;
}