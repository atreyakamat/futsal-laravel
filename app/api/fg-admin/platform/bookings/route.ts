import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createApprovalRequest, getAdminContext } from '@/lib/admin';
import { createBookingBatch } from '@/lib/domain';
import { readAuthUserId } from '@/lib/session';
import { sendTicketEmail } from '@/lib/ticket';
import { normalizePhoneNumber } from '@/lib/phone';

const bodySchema = z.object({
  arena_id: z.coerce.number().int().positive(),
  date: z.string().min(10),
  slots: z.array(z.string().min(1)).min(1),
  customer_name: z.string().min(1).max(100),
  customer_mobile: z.string().min(5).max(15),
  customer_email: z.string().email().nullable().optional(),
  free_booking: z.boolean().optional().default(false),
  notes: z.string().max(500).optional().nullable(),
});

async function readPayload(request: Request) {
  const isJson = request.headers.get('content-type')?.includes('application/json');
  if (isJson) return { isJson, raw: await request.json() };
  return { isJson, raw: Object.fromEntries((await request.formData()).entries()) };
}

function parseSlots(raw: string | string[] | undefined) {
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (!raw) return [];
  if (raw.startsWith('[')) return JSON.parse(raw) as string[];
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function POST(request: Request) {
  const { isJson, raw } = await readPayload(request);
  const payloadObject = raw as Record<string, string | string[]>;
  const slots = parseSlots(payloadObject.slots);

  const payload = bodySchema.parse({
    arena_id: Number(payloadObject.arena_id),
    date: String(payloadObject.date),
    slots,
    customer_name: String(payloadObject.customer_name),
    customer_mobile: normalizePhoneNumber(String(payloadObject.customer_mobile)),
    customer_email: payloadObject.customer_email ? String(payloadObject.customer_email) : null,
    free_booking: String(payloadObject.free_booking ?? 'false') === 'true' || payloadObject.free_booking === 'on' || payloadObject.free_booking === '1',
    notes: payloadObject.notes ? String(payloadObject.notes) : null,
  });

  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || !['super_admin', 'admin', 'arena_admin'].includes(context.role)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
  }

  const arenaId = context.role === 'arena_admin'
    ? context.arenaId
    : payload.arena_id;

  if (!arenaId) {
    return NextResponse.json({ success: false, message: 'No arena assigned for this account.' }, { status: 400 });
  }

  if (payload.free_booking && context.role !== 'super_admin') {
    const requestRecord = await createApprovalRequest({
      arenaId,
      requestedBy: context.id,
      requestType: 'admin_free_booking',
      payload: {
        arenaId,
        bookingDate: payload.date,
        slots: payload.slots,
        customerName: payload.customer_name,
        customerMobile: payload.customer_mobile,
        customerEmail: payload.customer_email ?? null,
        freeBooking: true,
        requestedByRole: context.role,
      },
      notes: payload.notes ?? null,
    });

    if (!requestRecord) {
      return NextResponse.json({ success: false, message: 'Failed to create approval request' }, { status: 400 });
    }

    if (!isJson) {
      return NextResponse.redirect(new URL('/fg-admin/platform/bookings?requested=1', request.url));
    }

    return NextResponse.json({ success: true, approvalRequestId: requestRecord.id });
  }

  const booking = await createBookingBatch({
    arenaId,
    bookingDate: payload.date,
    slots: payload.slots,
    customerName: payload.customer_name,
    customerMobile: payload.customer_mobile,
    customerEmail: payload.customer_email ?? null,
    userId: null,
    sessionId: `admin-${context.id}-${Date.now()}`,
    freeBooking: payload.free_booking,
  });

  if (payload.free_booking) {
    await sendTicketEmail(booking.bookingRef);
  }

  const redirectTarget = payload.free_booking
    ? `/booking/success/${booking.bookingRef}`
    : `/payment/checkout/${booking.bookingRef}`;

  if (!isJson) {
    return NextResponse.redirect(new URL(redirectTarget, request.url));
  }

  return NextResponse.json({ success: true, bookingRef: booking.bookingRef, redirectTo: redirectTarget });
}
