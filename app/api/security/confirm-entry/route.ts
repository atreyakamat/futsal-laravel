import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AUTH_COOKIE, getCookieValueFromRequest } from '@/lib/session';
import { confirmEntryByTicket } from '@/lib/domain';

const bodySchema = z.object({
  ticket_number: z.string().min(1),
});

export async function POST(request: Request) {
  const isJson = request.headers.get('content-type')?.includes('application/json');
  const payload = bodySchema.parse(
    isJson ? await request.json() : Object.fromEntries((await request.formData()).entries())
  );
  const checkedInBy = getCookieValueFromRequest(request, AUTH_COOKIE);
  const result = await confirmEntryByTicket(payload.ticket_number, checkedInBy ? Number(checkedInBy) : null);

  if (!isJson) {
    return NextResponse.redirect(new URL(`/security/scan?ticket_number=${encodeURIComponent(payload.ticket_number)}&result=${result.success ? 'success' : 'error'}`, request.url));
  }

  return NextResponse.json(result, result.success ? { status: 200 } : { status: 400 });
}