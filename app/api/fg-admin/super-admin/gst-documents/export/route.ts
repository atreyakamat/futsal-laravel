import { NextResponse } from 'next/server';
import { readSuperAdminId } from '@/lib/session';
import { query } from '@/lib/domain';

function csvEscape(value: string | number) {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export async function GET(request: Request) {
  const superAdminId = await readSuperAdminId();
  if (!superAdminId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // "YYYY-MM"
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ success: false, message: 'month query param is required, format YYYY-MM' }, { status: 400 });
  }

  const rangeStart = `${month}-01`;
  const rangeEnd = `${month}-31`; // inclusive upper bound is fine for a date-string comparison window

  const invoices = await query<any>(
    `SELECT invoice_no, issue_datetime, booking_ref, customer_name, gross_amount, taxable_value, cgst, sgst
       FROM tax_invoices
      WHERE issue_datetime >= ? AND issue_datetime < (DATE ? + INTERVAL '1 month')
      ORDER BY issue_datetime ASC`,
    [rangeStart, rangeStart]
  );

  const creditNotes = await query<any>(
    `SELECT cn.note_no, cn.issue_date, cn.booking_ref, ti.invoice_no AS linked_invoice_no, cn.amount, cn.taxable_value_reversed, cn.cgst_reversed, cn.sgst_reversed
       FROM credit_notes cn
       JOIN tax_invoices ti ON ti.id = cn.linked_invoice_id
      WHERE cn.issue_date >= ? AND cn.issue_date < (DATE ? + INTERVAL '1 month')
      ORDER BY cn.issue_date ASC`,
    [rangeStart, rangeStart]
  );

  const totalInvoiceTax = invoices.reduce((sum, i) => sum + Number(i.cgst) + Number(i.sgst), 0);
  const totalCreditNoteTax = creditNotes.reduce((sum, c) => sum + Number(c.cgst_reversed) + Number(c.sgst_reversed), 0);
  const netOutputTax = parseFloat((totalInvoiceTax - totalCreditNoteTax).toFixed(2));

  const lines: string[] = [];
  lines.push(`GST Monthly Reconciliation — ${month}`);
  lines.push('');
  lines.push('TAX INVOICES');
  lines.push(['Invoice No', 'Date', 'Booking Ref', 'Customer', 'Gross', 'Taxable Value', 'CGST', 'SGST'].map(csvEscape).join(','));
  for (const inv of invoices) {
    lines.push([
      inv.invoice_no,
      new Date(inv.issue_datetime).toISOString(),
      inv.booking_ref,
      inv.customer_name,
      Number(inv.gross_amount).toFixed(2),
      Number(inv.taxable_value).toFixed(2),
      Number(inv.cgst).toFixed(2),
      Number(inv.sgst).toFixed(2),
    ].map(csvEscape).join(','));
  }
  lines.push('');
  lines.push('CREDIT NOTES');
  lines.push(['Note No', 'Date', 'Booking Ref', 'Against Invoice', 'Amount', 'Taxable Value Reversed', 'CGST Reversed', 'SGST Reversed'].map(csvEscape).join(','));
  for (const cn of creditNotes) {
    lines.push([
      cn.note_no,
      new Date(cn.issue_date).toISOString(),
      cn.booking_ref,
      cn.linked_invoice_no,
      Number(cn.amount).toFixed(2),
      Number(cn.taxable_value_reversed).toFixed(2),
      Number(cn.cgst_reversed).toFixed(2),
      Number(cn.sgst_reversed).toFixed(2),
    ].map(csvEscape).join(','));
  }
  lines.push('');
  lines.push('SUMMARY');
  lines.push(`Total Tax Invoices,${invoices.length}`);
  lines.push(`Total Credit Notes,${creditNotes.length}`);
  lines.push(`Total Tax on Invoices,${totalInvoiceTax.toFixed(2)}`);
  lines.push(`Total Tax Reversed via Credit Notes,${totalCreditNoteTax.toFixed(2)}`);
  lines.push(`Net Output Tax Liability,${netOutputTax.toFixed(2)}`);

  const csv = lines.join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="gst-reconciliation-${month}.csv"`,
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
