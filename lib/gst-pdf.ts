import PDFDocument from 'pdfkit';

interface TaxInvoiceData {
  invoice_no: string;
  issue_datetime: Date | string;
  booking_ref: string;
  gross_amount: number | string;
  taxable_value: number | string;
  cgst: number | string;
  sgst: number | string;
  rate: number | string;
  hsn_sac: string;
  place_of_supply: string;
  gstin: string;
  legal_name: string;
  registered_address: string | null;
  customer_name: string;
  customer_mobile: string;
  customer_email: string | null;
  customer_gstin?: string | null;
  description: string;
}

interface CreditNoteData {
  note_no: string;
  issue_date: Date | string;
  booking_ref: string;
  amount: number | string;
  taxable_value_reversed: number | string;
  cgst_reversed: number | string;
  sgst_reversed: number | string;
  reason: string | null;
  linked_invoice_no: string;
}

function collectPdf(build: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));
      build(doc);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function drawHeader(doc: PDFKit.PDFDocument, title: string, docNo: string, date: Date | string) {
  doc.rect(0, 0, 595, 90).fill('#050505');
  doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text(title, 40, 30, { characterSpacing: 1 });
  doc.fillColor('#0df220').fontSize(9).font('Helvetica-Bold').text('AGNEL ARENA', 40, 58, { characterSpacing: 2 });
  doc.fillColor('#ffffff').fontSize(9).font('Helvetica')
    .text(`No: ${docNo}`, 380, 35, { align: 'right', width: 175 })
    .text(`Date: ${new Date(date).toLocaleDateString('en-GB')}`, 380, 50, { align: 'right', width: 175 });
}

function drawRow(doc: PDFKit.PDFDocument, y: number, label: string, value: string) {
  doc.fillColor('#666666').fontSize(9).font('Helvetica').text(label, 40, y);
  doc.fillColor('#050505').fontSize(10).font('Helvetica-Bold').text(value, 250, y, { width: 305, align: 'right' });
  return y + 20;
}

export async function generateTaxInvoicePdfBuffer(invoice: TaxInvoiceData): Promise<Buffer> {
  return collectPdf((doc) => {
    drawHeader(doc, 'TAX INVOICE', invoice.invoice_no, invoice.issue_datetime);

    let y = 120;
    doc.fillColor('#888888').fontSize(8).font('Helvetica-Bold').text('SUPPLIER', 40, y);
    y += 14;
    y = drawRow(doc, y, 'Legal Name', invoice.legal_name);
    y = drawRow(doc, y, 'GSTIN', invoice.gstin);
    if (invoice.registered_address) y = drawRow(doc, y, 'Address', invoice.registered_address);
    y = drawRow(doc, y, 'Place of Supply', invoice.place_of_supply);

    y += 15;
    doc.fillColor('#888888').fontSize(8).font('Helvetica-Bold').text('CUSTOMER', 40, y);
    y += 14;
    y = drawRow(doc, y, 'Name', invoice.customer_name);
    if (invoice.customer_gstin) y = drawRow(doc, y, 'GSTIN', invoice.customer_gstin);
    y = drawRow(doc, y, 'Mobile', invoice.customer_mobile);
    if (invoice.customer_email) y = drawRow(doc, y, 'Email', invoice.customer_email);
    y = drawRow(doc, y, 'Booking Ref', invoice.booking_ref);
    y = drawRow(doc, y, 'Description', invoice.description);
    y = drawRow(doc, y, 'HSN/SAC', invoice.hsn_sac);

    y += 15;
    doc.strokeColor('#e5e5e5').moveTo(40, y).lineTo(555, y).stroke();
    y += 15;
    doc.fillColor('#888888').fontSize(8).font('Helvetica-Bold').text('TAX BREAKDOWN', 40, y);
    y += 16;
    y = drawRow(doc, y, 'Taxable Value', `₹${Number(invoice.taxable_value).toFixed(2)}`);
    y = drawRow(doc, y, `CGST (${(Number(invoice.rate) / 2).toFixed(1)}%)`, `₹${Number(invoice.cgst).toFixed(2)}`);
    y = drawRow(doc, y, `SGST (${(Number(invoice.rate) / 2).toFixed(1)}%)`, `₹${Number(invoice.sgst).toFixed(2)}`);
    doc.strokeColor('#e5e5e5').moveTo(40, y).lineTo(555, y).stroke();
    y += 10;
    doc.fillColor('#050505').fontSize(12).font('Helvetica-Bold').text('Total (Gross)', 40, y);
    doc.fillColor('#0df220').fontSize(12).font('Helvetica-Bold').text(`₹${Number(invoice.gross_amount).toFixed(2)}`, 250, y, { width: 305, align: 'right' });
  });
}

export async function generateCreditNotePdfBuffer(note: CreditNoteData): Promise<Buffer> {
  return collectPdf((doc) => {
    drawHeader(doc, 'CREDIT NOTE', note.note_no, note.issue_date);

    let y = 120;
    y = drawRow(doc, y, 'Against Invoice', note.linked_invoice_no);
    y = drawRow(doc, y, 'Booking Ref', note.booking_ref);
    if (note.reason) y = drawRow(doc, y, 'Reason', note.reason);

    y += 15;
    doc.strokeColor('#e5e5e5').moveTo(40, y).lineTo(555, y).stroke();
    y += 15;
    doc.fillColor('#888888').fontSize(8).font('Helvetica-Bold').text('TAX REVERSED', 40, y);
    y += 16;
    y = drawRow(doc, y, 'Taxable Value Reversed', `₹${Number(note.taxable_value_reversed).toFixed(2)}`);
    y = drawRow(doc, y, 'CGST Reversed', `₹${Number(note.cgst_reversed).toFixed(2)}`);
    y = drawRow(doc, y, 'SGST Reversed', `₹${Number(note.sgst_reversed).toFixed(2)}`);
    doc.strokeColor('#e5e5e5').moveTo(40, y).lineTo(555, y).stroke();
    y += 10;
    doc.fillColor('#050505').fontSize(12).font('Helvetica-Bold').text('Total Credited', 40, y);
    doc.fillColor('#0df220').fontSize(12).font('Helvetica-Bold').text(`₹${Number(note.amount).toFixed(2)}`, 250, y, { width: 305, align: 'right' });
  });
}
