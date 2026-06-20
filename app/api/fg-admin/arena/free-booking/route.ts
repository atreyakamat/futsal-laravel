import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readAuthUserId, readArenaId } from '@/lib/session';
import { getAdminContext, createApprovalRequest, createAdminAuditLog } from '@/lib/admin';

const bodySchema = z.object({
  booking_date: z.string().min(10),
  time_slot: z.string().min(1),
  customer_name: z.string().min(1).default('Free Booking'),
  customer_mobile: z.string().min(1).default('N/A'),
  customer_email: z.string().email().optional().nullable(),
  reason: z.string().max(500).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const userId = await readAuthUserId();
    const arenaId = await readArenaId();

    if (!userId || !arenaId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const context = await getAdminContext(userId);
    if (!context || context.role !== 'arena_admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const isJson = request.headers.get('content-type')?.includes('application/json');
    const payload = bodySchema.parse(
      isJson ? await request.json() : Object.fromEntries((await request.formData()).entries())
    );

    // Generate slots from time_slot (comma-separated support)
    const slots = payload.time_slot.split(',').map((s) => s.trim());

    const approval = await createApprovalRequest({
      arenaId,
      requestedBy: context.id,
      requestType: 'FREE_BOOKING_REQUEST',
      payload: {
        bookingDate: payload.booking_date,
        slots,
        customerName: payload.customer_name,
        customerMobile: payload.customer_mobile,
        customerEmail: payload.customer_email,
      },
      notes: payload.reason ?? 'Free booking request from arena admin',
    });

    await createAdminAuditLog({
      action: 'FREE_BOOKING_REQUESTED',
      requestedBy: context.id,
      arenaId,
      newValue: { bookingDate: payload.booking_date, slots, customerName: payload.customer_name },
    });

    return NextResponse.json({ success: true, message: 'Free booking request submitted for approval', requestId: approval?.id });
  } catch (error) {
    console.error('Free booking request error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'Invalid input', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
