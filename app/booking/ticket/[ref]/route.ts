import { getBookingsByRef } from '@/lib/domain';
import { mergeSlots, getDurationText } from '@/lib/slot-merge';

export async function GET(_: Request, context: { params: Promise<{ ref: string }> }) {
  const { ref } = await context.params;
  const bookings = await getBookingsByRef(ref);

  if (bookings.length === 0) {
    return new Response('Ticket not found.', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  }

  const slots = bookings.map((booking) => booking.time_slot);
  const mergedSlots = mergeSlots(slots);

  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Ticket ${ref}</title>
      <style>
        body { font-family: Arial, sans-serif; background: #07111f; color: #eff6ff; padding: 32px; }
        .card { max-width: 720px; margin: 0 auto; background: rgba(10, 20, 35, 0.92); border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; padding: 28px; }
        .muted { color: #9fb4cc; }
        .title { font-size: 32px; margin: 0 0 12px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="muted">FutsalGoa Ticket</div>
        <h1 class="title">${ref}</h1>
        <p class="muted">${bookings[0].customer_name}</p>
        <p class="muted">${bookings[0].booking_date} · ${mergedSlots.join(', ')}</p>
        <p class="muted">Duration: ${getDurationText(slots)}</p>
        <p class="muted">Ticket numbers: ${bookings.map((booking) => booking.ticket_number).join(', ')}</p>
      </div>
    </body>
  </html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}