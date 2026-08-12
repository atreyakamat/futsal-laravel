/**
 * POST /api/fg-admin/arena/refund
 *
 * Arena Admins are NOT permitted to issue refunds.
 * Refunds must be processed by a Super Admin via /api/fg-admin/super-admin/refund.
 *
 * This route is intentionally disabled — returns 403.
 */
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message:
        'Arena Admins are not permitted to issue refunds. Please contact a Super Admin to process refunds. Arena Admins may reschedule bookings via the Reschedule action.',
    },
    { status: 403 }
  );
}
