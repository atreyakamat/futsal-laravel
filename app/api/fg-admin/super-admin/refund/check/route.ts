import { NextRequest, NextResponse } from 'next/server';
import { readSuperAdminOrArenaAdminId } from '@/lib/session';
import { query } from '@/lib/domain';
import { getAdminContext, hasArenaAccess } from '@/lib/admin';
import { reconcileRefundStatus } from '@/lib/refund-reconcile';
import { logAuditAction } from '@/lib/super-admin';

export async function POST(req: NextRequest) {
  try {
    const superAdminId = await readSuperAdminOrArenaAdminId();
    if (!superAdminId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const context = await getAdminContext(superAdminId);
    if (!context) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const refundRequestId = body.refundRequestId || body.refund_request_id || null;
    const bookingRef = body.booking_ref || body.ref || null;

    if (!refundRequestId && !bookingRef) {
      return NextResponse.json({ success: false, message: 'refundRequestId or booking_ref required' }, { status: 400 });
    }

    let targetRefundId = refundRequestId;
    if (bookingRef) {
      const row = (await query('SELECT payu_refund_request_id, arena_id FROM bookings WHERE booking_ref = ? LIMIT 1', [bookingRef])) as any[];
      if (!hasArenaAccess(context, row?.[0]?.arena_id)) {
        return NextResponse.json({ success: false, message: 'You are not authorized for this arena.' }, { status: 403 });
      }
      if (!targetRefundId) {
        targetRefundId = (row?.[0] as any)?.payu_refund_request_id || null;
        if (!targetRefundId) {
          return NextResponse.json({ success: false, message: 'No PayU refund request id found for booking_ref' }, { status: 404 });
        }
      }
    } else if (refundRequestId) {
      const owner = (await query('SELECT arena_id FROM bookings WHERE payu_refund_request_id = ? LIMIT 1', [refundRequestId])) as any[];
      if (owner?.length > 0 && !hasArenaAccess(context, owner[0].arena_id)) {
        return NextResponse.json({ success: false, message: 'You are not authorized for this arena.' }, { status: 403 });
      }
    }

    const result = await reconcileRefundStatus(targetRefundId as string);

    await logAuditAction(
      superAdminId,
      'REFUND_STATUS_RECONCILE',
      'booking',
      undefined,
      {
        refundRequestId: targetRefundId,
        payuStatus: result.raw?.status,
        mappedStatus: result.mapped?.refund_status,
        note: result.mapped?.note,
      },
      req.headers.get('x-forwarded-for') || 'unknown',
      req.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({ success: true, mapped: result.mapped, raw: result.raw });
  } catch (err: any) {
    console.error('Refund status reconcile error', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
