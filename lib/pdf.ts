import PDFDocument from 'pdfkit';
import { generateQrDataUrl } from './qr';

interface BookingData {
  ticket_number: string;
  booking_ref: string;
  customer_name: string;
  customer_mobile: string;
  customer_email: string | null;
  booking_date: string;
  time_slot: string;
  amount: number | string;
  payment_status: string;
  created_at: Date;
}

export async function generateTicketPdfBuffer(
  booking: BookingData,
  arenaName: string,
  arenaAddress: string
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // 1. Sleek Neon Accent Top Header
      doc.rect(0, 0, 595, 15).fill('#0df220');

      // 2. Main Ticket Header
      doc.fillColor('#050505');
      doc.rect(0, 15, 595, 90).fill('#050505');

      doc.fillColor('#ffffff')
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('AGNEL ARENA', 40, 35, { characterSpacing: 1.5 });

      doc.fillColor('#0df220')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('PREMIUM FUTSAL BOOKING TICKET', 40, 65, { characterSpacing: 2 });

      doc.fillColor('#ffffff')
        .fontSize(9)
        .font('Helvetica')
        .text(`Ref: ${booking.booking_ref}`, 400, 45, { align: 'right' })
        .text(`Issued: ${new Date(booking.created_at).toLocaleDateString('en-GB')}`, 400, 60, { align: 'right' });

      // 3. Ticket Layout Body Section
      let y = 140;

      // Draw dashed cutting border
      doc.strokeColor('#cccccc')
        .lineWidth(1)
        .dash(5, { space: 5 })
        .moveTo(20, y - 10)
        .lineTo(575, y - 10)
        .stroke()
        .undash();

      // Booking details section on left
      doc.fillColor('#888888')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('BOOKING DETAILS', 40, y);

      y += 18;
      // Main Metadata Box
      doc.fillColor('#111111')
        .rect(40, y, 320, 240)
        .fill('#f5f5f5')
        .strokeColor('#e5e5e5')
        .lineWidth(1)
        .stroke();

      // Labels & Values inside the Metadata Box
      let boxY = y + 15;
      const drawMetaRow = (label: string, val: string) => {
        doc.fillColor('#888888')
          .fontSize(8)
          .font('Helvetica-Bold')
          .text(label.toUpperCase(), 55, boxY);
        
        doc.fillColor('#050505')
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(val, 55, boxY + 12);
        
        boxY += 36;
      };

      drawMetaRow('Customer Name', booking.customer_name);
      drawMetaRow('Contact Mobile', booking.customer_mobile);
      drawMetaRow('Arena / Venue', arenaName);
      drawMetaRow('Date & Time Slot', `${new Date(booking.booking_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} | ${booking.time_slot}`);
      drawMetaRow('Payment Status', `${booking.payment_status.toUpperCase()} - (₹${Number(booking.amount).toFixed(2)})`);

      // 4. QR Code & Scan verification on the right
      const qrLink = `https://agnelarenagoa.com/verify-ticket?ticket=${booking.ticket_number}`;
      const qrDataUrl = await generateQrDataUrl(qrLink);
      const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
      const qrBuffer = Buffer.from(base64Data, 'base64');

      doc.image(qrBuffer, 390, y + 10, { width: 160 });

      doc.fillColor('#888888')
        .fontSize(7)
        .font('Helvetica-Bold')
        .text('TICKET CODE / SCAN TO VERIFY', 390, y + 180, { align: 'center', width: 160 });

      doc.fillColor('#050505')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(booking.ticket_number, 390, y + 195, { align: 'center', width: 160 });

      y += 260;

      // 5. Terms & Guidelines Footer
      doc.strokeColor('#e5e5e5')
        .lineWidth(1)
        .moveTo(40, y)
        .lineTo(555, y)
        .stroke();

      y += 15;
      doc.fillColor('#050505')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('ENTRY GUIDELINES & VENUE RULES', 40, y);

      const rules = [
        'Please show this PDF ticket or QR code to the security staff at the entrance.',
        `Address: ${arenaAddress}`,
        'Strictly arrive 10-15 minutes prior to your allocated slot timing.',
        'Spikes/studs and sports attire rules of the respective turf apply.',
        'Booking changes/transfers are subject to admin policies.'
      ];

      y += 15;
      doc.fillColor('#555555')
        .fontSize(8)
        .font('Helvetica')
        .list(rules, 40, y, { bulletRadius: 2, lineGap: 4 });

      // End document
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
