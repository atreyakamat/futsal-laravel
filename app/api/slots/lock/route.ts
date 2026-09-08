import { NextResponse } from 'next/server';
import { z } from 'zod';
import { lockSlots } from '@/lib/domain';
import { getWritableSessionId, persistSessionCookie } from '@/lib/session';
import { verifyCsrfMiddleware } from '@/lib/csrf-middleware';

const bodySchema = z.object({
  arena_id: z.number().int().positive(),
  date: z.string().min(10),
  slots: z.array(z.string().min(1)).min(1),
});

export async function POST(request: Request) {
  const csrfError = await verifyCsrfMiddleware(request);
  if (csrfError) return csrfError;

  const payload = bodySchema.parse(await request.json());
  const sessionId = getWritableSessionId(request);
  // null (not a placeholder string) when absent — an 'unknown' bucket shared
  // across every such request would count them all toward one shared cap.
  const clientIp = request.headers.get('x-forwarded-for') || null;
  const result = await lockSlots(payload.arena_id, payload.date, payload.slots, sessionId, clientIp);

  const response = NextResponse.json({
    success: result?.failed?.length === 0,
    locked: result.locked,
    failed: result.failed,
  });

  persistSessionCookie(response, sessionId);
  return response;
}