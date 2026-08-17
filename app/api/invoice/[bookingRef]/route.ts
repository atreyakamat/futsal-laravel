import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/domain';
import { verifyTicketDownloadToken } from '@/lib/ticket-token';
import { generateTaxInvoicePdfBuffer } from '@/lib/gst-pdf';

// Public, signed-token invoice download for customers (mirrors
// app/api/bookings/download/route.ts's ticket PDF pattern) -- distinct from
// app/api/fg-admin/super-admin/gst-documents/download, which requires an
// admin session and isn't reachable from a customer-facing email link.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingRef: string }> }
) {
  try {
    const { bookingRef } = await params;
    const token = request.nextUrl.searchParams.get('token');

    if (!verifyTicketDownloadToken(bookingRef, token)) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired download link.' },
        { status: 403 }
      );
    }

    const invoice = await queryOne<any>(`SELECT * FROM tax_invoices WHERE booking_ref = ? LIMIT 1`, [bookingRef]);
    if (!invoice) {
      return NextResponse.json(
        { success: false, message: 'No invoice has been issued for this booking.' },
        { status: 404 }
      );
    }

    const pdfBuffer = await generateTaxInvoicePdfBuffer(invoice);

    return new Response(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.invoice_no}.pdf"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('[API Invoice] Download error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
