import { NextResponse } from 'next/server';
import { z } from 'zod';
import { releaseLocks } from '@/lib/domain';
import { getWritableSessionId, persistSessionCookie } from '@/lib/session';
import { verifyCsrfMiddleware } from '@/lib/csrf-middleware';

const bodySchema = z.object({
  arena_id: z.number().int().positive(),
  date: z.string().min(10),
  slots: z.array(z.string().min(1)).optional(),
});

export async function POST(request: Request) {
  const csrfError = await verifyCsrfMiddleware(request);
  if (csrfError) return csrfError;

  const payload = bodySchema.parse(await request.json());
  const sessionId = getWritableSessionId(request);

  await releaseLocks(sessionId, payload.arena_id, payload.date, payload.slots);

  const response = NextResponse.json({ success: true });
  persistSessionCookie(response, sessionId);
  return response;
}