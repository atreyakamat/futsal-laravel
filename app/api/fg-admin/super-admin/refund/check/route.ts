import { NextRequest, NextResponse } from 'next/server';
import { readSuperAdminId } from '@/lib/session';
import { query } from '@/lib/domain';
import { reconcileRefundStatus } from '@/lib/refund-reconcile';
import { logAuditAction } from '@/lib/super-admin';

export async function POST(req: NextRequest) {
  try {
    const superAdminId = await readSuperAdminId();
    if (!superAdminId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const refundRequestId = body.refundRequestId || body.refund_request_id || null;
    const bookingRef = body.booking_ref || body.ref || null;

    if (!refundRequestId && !bookingRef) {
      return NextResponse.json({ success: false, message: 'refundRequestId or booking_ref required' }, { status: 400 });
    }

    let targetRefundId = refundRequestId;
    if (!targetRefundId && bookingRef) {
      const row = (await query('SELECT payu_refund_request_id FROM bookings WHERE booking_ref = ? LIMIT 1', [bookingRef])) as any[];
      targetRefundId = (row?.[0] as any)?.payu_refund_request_id || null;
      if (!targetRefundId) {
        return NextResponse.json({ success: false, message: 'No PayU refund request id found for booking_ref' }, { status: 404 });
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
