import { NextResponse } from 'next/server';
import { readAuthUserId } from '@/lib/session';
import { getAdminContext } from '@/lib/admin';
import { queryOne } from '@/lib/domain';
import { generateTaxInvoicePdfBuffer, generateCreditNotePdfBuffer } from '@/lib/gst-pdf';
import { reportServerError } from '@/lib/error-log';

export async function GET(request: Request) {
  try {
    const userId = await readAuthUserId();
    const context = await getAdminContext(userId);
    if (!context || !['super_admin', 'accountant'].includes(context.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = Number(searchParams.get('id'));

    if (!id || (type !== 'invoice' && type !== 'credit-note')) {
      return NextResponse.json({ success: false, message: 'type and id are required' }, { status: 400 });
    }

    if (type === 'invoice') {
      const invoice = await queryOne<any>(`SELECT * FROM tax_invoices WHERE id = ?`, [id]);
      if (!invoice) {
        return NextResponse.json({ success: false, message: 'Invoice not found' }, { status: 404 });
      }
      const pdfBuffer = await generateTaxInvoicePdfBuffer(invoice);
      return new Response(pdfBuffer as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${invoice.invoice_no}.pdf"`,
          'Cache-Control': 'no-store, max-age=0',
        },
      });
    }

    const note = await queryOne<any>(`SELECT * FROM credit_notes WHERE id = ?`, [id]);
    if (!note) {
      return NextResponse.json({ success: false, message: 'Credit note not found' }, { status: 404 });
    }
    const invoice = await queryOne<any>(`SELECT invoice_no FROM tax_invoices WHERE id = ?`, [note.linked_invoice_id]);
    const pdfBuffer = await generateCreditNotePdfBuffer({ ...note, linked_invoice_no: invoice?.invoice_no || 'N/A' });
    return new Response(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${note.note_no}.pdf"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err) {
    reportServerError(err, { route: 'gst-documents/download' });
    return NextResponse.json({ success: false, message: 'Failed to generate document' }, { status: 500 });
  }
}
