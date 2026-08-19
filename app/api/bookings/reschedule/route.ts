import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { readAuthUserId } from '@/lib/session';
import { rescheduleBooking } from '@/lib/domain';
import { sendRescheduleTicketEmail } from '@/lib/ticket';
import { reportServerError } from '@/lib/error-log';

const schema = z.object({
  ref: z.string().min(1, 'Booking reference is required'),
  newDate: z.string().min(10),
  newSlots: z.array(z.string().min(1)).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const userId = await readAuthUserId();
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const payload = schema.parse(await req.json());

    const result = await rescheduleBooking({
      bookingRef: payload.ref,
      userId,
      newDate: payload.newDate,
      newSlots: payload.newSlots,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, code: result.code, message: result.message }, { status: 400 });
    }

    const proto = req.headers.get('x-forwarded-proto') || 'http';
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;

    // Reissuing the ticket is best-effort — the reschedule itself already
    // succeeded and committed, a notification hiccup shouldn't roll it back
    // or report failure to the customer.
    try {
      await sendRescheduleTicketEmail(result.oldBookingRef, result.newBookingRef, appUrl);
    } catch (notifyErr) {
      reportServerError(notifyErr, { route: 'bookings/reschedule', step: 'notify' });
    }

    return NextResponse.json({
      success: true,
      message: 'Your booking has been rescheduled and a new ticket has been sent.',
      newBookingRef: result.newBookingRef,
      newDate: result.newDate,
      newSlots: result.newSlots,
      newTotal: result.newTotal,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'Invalid input', errors: err.errors }, { status: 400 });
    }
    reportServerError(err, { route: 'bookings/reschedule' });
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
