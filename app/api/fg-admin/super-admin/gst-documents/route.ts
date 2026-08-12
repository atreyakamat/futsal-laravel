import { NextResponse } from 'next/server';
import { readSuperAdminId } from '@/lib/session';
import { query } from '@/lib/domain';
import { issueTaxInvoice } from '@/lib/gst-documents';

export async function GET(request: Request) {
  const superAdminId = await readSuperAdminId();
  if (!superAdminId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const invoiceClauses: string[] = [];
  const invoiceParams: any[] = [];
  if (from) { invoiceClauses.push('issue_datetime >= ?'); invoiceParams.push(from); }
  if (to) { invoiceClauses.push('issue_datetime <= ?'); invoiceParams.push(`${to} 23:59:59`); }

  const invoices = await query<any>(
    `SELECT id, booking_ref, invoice_no, issue_datetime, gross_amount, taxable_value, cgst, sgst, customer_name
       FROM tax_invoices
       ${invoiceClauses.length ? `WHERE ${invoiceClauses.join(' AND ')}` : ''}
      ORDER BY issue_datetime DESC
      LIMIT 500`,
    invoiceParams
  );

  const noteClauses: string[] = [];
  const noteParams: any[] = [];
  if (from) { noteClauses.push('issue_date >= ?'); noteParams.push(from); }
  if (to) { noteClauses.push('issue_date <= ?'); noteParams.push(`${to} 23:59:59`); }

  const creditNotes = await query<any>(
    `SELECT cn.id, cn.booking_ref, cn.note_no, cn.issue_date, cn.amount, cn.taxable_value_reversed,
            cn.cgst_reversed, cn.sgst_reversed, ti.invoice_no AS linked_invoice_no
       FROM credit_notes cn
       JOIN tax_invoices ti ON ti.id = cn.linked_invoice_id
       ${noteClauses.length ? `WHERE ${noteClauses.join(' AND ')}` : ''}
      ORDER BY cn.issue_date DESC
      LIMIT 500`,
    noteParams
  );

  // Bookings that were confirmed/paid but never got an invoice — GST generation failures needing attention.
  // DISTINCT ON booking_ref since bookings has one row per slot.
  const needsAttention = await query<any>(
    `SELECT DISTINCT ON (b.booking_ref)
            b.booking_ref, b.customer_name, b.payment_status, b.payment_method, b.venue_payment_status, b.created_at,
            (SELECT SUM(amount) FROM bookings b2 WHERE b2.booking_ref = b.booking_ref) AS total_amount
       FROM bookings b
      WHERE (
              (b.payment_method = 'online' AND b.payment_status = 'confirmed')
           OR (b.payment_method = 'offline' AND b.venue_payment_status = 'PAID')
            )
        AND b.is_free_booking = FALSE
        AND NOT EXISTS (SELECT 1 FROM tax_invoices ti WHERE ti.booking_ref = b.booking_ref)
      ORDER BY b.booking_ref, b.created_at DESC
      LIMIT 100`
  );

  return NextResponse.json({ success: true, data: { invoices, creditNotes, needsAttention } });
}

/** Retries invoice generation for a booking listed in "needs attention". */
export async function POST(request: Request) {
  const superAdminId = await readSuperAdminId();
  if (!superAdminId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const ref = String(body.booking_ref || '');
  if (!ref) {
    return NextResponse.json({ success: false, message: 'booking_ref is required' }, { status: 400 });
  }

  const result = await issueTaxInvoice(ref);
  if (!result.success) {
    return NextResponse.json({ success: false, message: result.error || 'Failed to issue invoice' }, { status: 400 });
  }

  return NextResponse.json({ success: true, message: 'Invoice issued', invoiceNo: result.invoiceNo });
}
