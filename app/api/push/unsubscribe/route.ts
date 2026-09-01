import { NextResponse } from 'next/server';
import { z } from 'zod';
import { removeSubscription } from '@/lib/push';
import { verifyCsrfMiddleware } from '@/lib/csrf-middleware';

const bodySchema = z.object({ endpoint: z.string().url() });

export async function POST(request: Request) {
  const csrfError = await verifyCsrfMiddleware(request);
  if (csrfError) return csrfError;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Invalid payload.' }, { status: 400 });
  }

  await removeSubscription(parsed.data.endpoint);
  return NextResponse.json({ success: true });
}
