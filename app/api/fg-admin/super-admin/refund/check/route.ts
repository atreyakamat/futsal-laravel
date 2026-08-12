import { NextRequest, NextResponse } from 'next/server';
import { readSuperAdminId } from '@/lib/session';
import { query } from '@/lib/domain';
import { checkPayuRefundStatus } from '@/lib/payment';
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

    // Find the refund request id if only bookingRef provided
    let targetRefundId = refundRequestId;
    if (!targetRefundId && bookingRef) {
      const row = (await query('SELECT payu_refund_request_id FROM bookings WHERE booking_ref = ? LIMIT 1', [bookingRef])) as any[];
      targetRefundId = (row?.[0] as any)?.payu_refund_request_id || null;
      if (!targetRefundId) {
        return NextResponse.json({ success: false, message: 'No PayU refund request id found for booking_ref' }, { status: 404 });
      }
    }

    const statusRes = await checkPayuRefundStatus(targetRefundId as string);

    // Map PayU status into internal refund_status
    const raw = (statusRes.status || '').toString().toUpperCase();
    let mapped: { refund_status: string; payment_status?: string | null; note?: string } = { refund_status: 'PROCESSING' };

    if (raw.includes('SUCCESS')) {
      mapped = { refund_status: 'REFUNDED', payment_status: 'refunded', note: 'PayU reported SUCCESS' };
    } else if (raw.includes('REQUEST') || raw.includes('REQUESTED')) {
      mapped = { refund_status: 'PENDING_REVIEW', note: 'PayU reported REQUESTED' };
    } else if (raw.includes('IN PROGRESS') || raw.includes('IN_PROGRESS') || raw.includes('PROCESS')) {
      mapped = { refund_status: 'PROCESSING', note: 'PayU reported IN PROGRESS' };
    } else if (raw.includes('REJECT')) {
      mapped = { refund_status: 'REJECTED', note: 'PayU reported REJECTED' };
    } else if (raw.includes('FAIL') || raw.includes('FAILED') || raw.includes('ERROR')) {
      mapped = { refund_status: 'REJECTED', note: 'PayU reported FAILURE' };
    } else {
      mapped = { refund_status: 'PROCESSING', note: `Unknown PayU status: ${statusRes.status}` };
    }

    // Update bookings for the booking_ref(s) that reference this refundRequestId
    const updated = (await query(
      `UPDATE bookings SET refund_status = ?, refund_processed_at = CASE WHEN ? = 'REFUNDED' THEN NOW() ELSE refund_processed_at END, payment_status = CASE WHEN ? = 'refunded' THEN 'refunded' ELSE payment_status END WHERE payu_refund_request_id = ? RETURNING id, booking_ref`,
      [mapped.refund_status, mapped.refund_status, mapped.payment_status || null, targetRefundId]
    )) as any[];

    // Log audit
    await logAuditAction(
      superAdminId,
      'REFUND_STATUS_RECONCILE',
      'booking',
      (updated?.[0] as any)?.id || null,
      {
        refundRequestId: targetRefundId,
        payuStatus: statusRes.status,
        mappedStatus: mapped.refund_status,
        note: mapped.note,
      },
      req.headers.get('x-forwarded-for') || 'unknown',
      req.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({ success: true, mapped: mapped, raw: statusRes });
  } catch (err: any) {
    console.error('Refund status reconcile error', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
