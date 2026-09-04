import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createApprovalRequest, getAdminContext, hasArenaAccess } from '@/lib/admin';
import { createBookingBatch, query } from '@/lib/domain';
import { readAuthUserId } from '@/lib/session';
import { sendTicketEmail } from '@/lib/ticket';
import { sendPendingPaymentEmail } from '@/lib/payment-reminder';
import { issueTaxInvoice } from '@/lib/gst-documents';
import { normalizePhoneNumber } from '@/lib/phone';

const bodySchema = z.object({
  arena_id: z.coerce.number().int().positive(),
  date: z.string().min(10),
  slots: z.array(z.string().min(1)).min(1),
  customer_name: z.string().min(1).max(100),
  customer_mobile: z.string().min(5).max(15),
  customer_email: z.string().email().nullable().optional(),
  free_booking: z.boolean().optional().default(false),
  // Discounted (but non-zero) price per slot — e.g. a manager offering
  // ₹300 instead of the normal ₹500. Distinct from free_booking (₹0).
  discounted_price_per_slot: z.coerce.number().nonnegative().optional(),
  // Cash/UPI payment the admin/manager collected from the walk-in customer
  // for a discounted booking — used to mark it paid and issue an invoice.
  // Meaningless (ignored) for a free booking, which collects nothing.
  payment_method: z.enum(['cash', 'upi']).optional(),
  payment_reference: z.string().max(120).optional(),
  notes: z.string().max(500).optional().nullable(),
  customer_gstin: z.string().max(20).nullable().optional(),
  customer_company_name: z.string().max(200).nullable().optional(),
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
    discounted_price_per_slot: payloadObject.discounted_price_per_slot ? Number(payloadObject.discounted_price_per_slot) : undefined,
    payment_method: payloadObject.payment_method ? String(payloadObject.payment_method) : undefined,
    payment_reference: payloadObject.payment_reference ? String(payloadObject.payment_reference) : undefined,
    notes: payloadObject.notes ? String(payloadObject.notes) : null,
    customer_gstin: payloadObject.customer_gstin ? String(payloadObject.customer_gstin) : null,
    customer_company_name: payloadObject.customer_company_name ? String(payloadObject.customer_company_name) : null,
  });

  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || !['super_admin', 'admin', 'arena_admin', 'manager'].includes(context.role)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
  }

  // manager is scoped to their own single arena; everyone else (super_admin,
  // and the platform-wide arena_admin) picks the arena from the submitted form.
  const arenaId = context.role === 'manager'
    ? context.arenaId
    : payload.arena_id;

  if (!arenaId) {
    return NextResponse.json({ success: false, message: 'No arena assigned for this account.' }, { status: 400 });
  }

  // A scoped arena_admin (assigned to specific turfs rather than
  // platform-wide) must not be able to act on a turf outside their
  // assignment just by naming a different arena_id in the request.
  if (!hasArenaAccess(context, arenaId)) {
    return NextResponse.json({ success: false, message: 'You are not authorized for this arena.' }, { status: 403 });
  }

  const isDiscounted = payload.discounted_price_per_slot !== undefined;

  // The plain (not free, not discounted) path is the "book on behalf of a
  // customer, they pay online later" flow — email matters there since it's
  // the only correspondence channel before the customer ever logs in. Free
  // and discounted walk-in bookings keep email optional, unchanged.
  if (!payload.free_booking && !isDiscounted && !payload.customer_email) {
    return NextResponse.json({ success: false, message: 'Customer email is required for a pay-later booking.' }, { status: 400 });
  }

  const needsApproval = (payload.free_booking || isDiscounted) && context.role !== 'super_admin' && context.role !== 'arena_admin';

  if (needsApproval) {
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
        // Discount takes priority when both happen to be present; a request
        // is either free or discounted, not both.
        discountedSlotPrice: isDiscounted ? payload.discounted_price_per_slot : undefined,
        paymentMethod: isDiscounted ? payload.payment_method : undefined,
        paymentReference: isDiscounted ? payload.payment_reference : undefined,
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
    // A discounted booking was paid in cash/UPI on the spot, not online —
    // offlinePayment confirms it immediately instead of leaving it
    // 'pending' and waiting for a PayU payment that will never happen.
    offlinePayment: isDiscounted,
    discountedSlotPrice: payload.discounted_price_per_slot,
    // Only the plain path is left 'pending' for the customer to pay online
    // later — exempts it from the 15-minute abandoned-checkout expiry (see
    // expirePendingBookings). Free/discounted bookings resolve immediately
    // either way, so the flag is meaningless for them.
    adminCreated: !payload.free_booking && !isDiscounted,
    customerGstin: payload.customer_gstin,
    customerCompanyName: payload.customer_company_name,
  });

  // Cash/UPI payment collected for a discounted booking is the point of
  // supply — mark it paid and issue the Tax Invoice here, same as
  // confirm-venue-payment does for a regular offline booking. A free (₹0)
  // booking has nothing to collect or invoice.
  if (isDiscounted && payload.payment_reference) {
    await query(
      `UPDATE bookings
          SET venue_payment_status = 'PAID',
              venue_payment_reference = ?,
              venue_payment_collected_by = ?,
              venue_payment_collected_at = NOW(),
              updated_at = NOW()
        WHERE booking_ref = ?`,
      [`${payload.payment_method ?? 'offline'}: ${payload.payment_reference}`, context.id, booking.bookingRef]
    );
    await issueTaxInvoice(booking.bookingRef);
  }

  const proto = request.headers.get('x-forwarded-proto') || 'http';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;

  // Free and discounted bookings both skip the payment gateway — the admin
  // applying them is the "payment" (an offline decision), not the customer
  // paying online, so this always goes straight to the success page.
  if (payload.free_booking || isDiscounted) {
    await sendTicketEmail(booking.bookingRef, baseUrl);
  } else {
    // Plain path — the customer pays online later. This is their only
    // notice before then; the 1-hour-before reminder (email + WhatsApp) is
    // handled separately by lib/payment-reminder-cron.ts.
    await sendPendingPaymentEmail(booking.bookingRef, baseUrl);
  }

  // The plain path leaves payment to the customer, not whoever's logged in
  // here as staff right now — sending THIS browser to PayU would be wrong.
  // Back to the bookings list with a plain confirmation instead.
  const redirectTarget = (payload.free_booking || isDiscounted)
    ? `/booking/success/${booking.bookingRef}`
    : `/fg-admin/platform/bookings?created=${booking.bookingRef}`;

  if (!isJson) {
    return NextResponse.redirect(new URL(redirectTarget, request.url));
  }

  return NextResponse.json({ success: true, bookingRef: booking.bookingRef, redirectTo: redirectTarget });
}
