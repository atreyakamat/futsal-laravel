import { buildTicketHtml, getTicketPackage } from '@/lib/ticket';

export async function GET(request: Request, context: { params: Promise<{ ref: string }> }) {
  const { ref } = await context.params;
  const ticket = await getTicketPackage(ref);

  if (!ticket) {
    return new Response('Ticket not found.', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  }

  const html = buildTicketHtml(ticket);
  const download = new URL(request.url).searchParams.get('download') === '1';

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...(download
        ? { 'Content-Disposition': `attachment; filename="ticket-${ref}.html"` }
        : {}),
    },
  });
}
