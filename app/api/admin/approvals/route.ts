import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createApprovalRequest, getAdminContext, listApprovalRequests } from '@/lib/admin';
import { readAuthUserId } from '@/lib/session';

const bodySchema = z.object({
  arena_id: z.coerce.number().int().positive(),
  request_type: z.enum(['slot_template_update', 'entry_mode_update', 'admin_free_booking']),
  payload_json: z.string().min(2),
  notes: z.string().max(500).optional().nullable(),
});

export async function GET(request: Request) {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || context.role !== 'super_admin') {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
  }

  const requests = await listApprovalRequests({
    arenaId: context.role === 'super_admin' ? null : context.arenaId,
  });

  return NextResponse.json({ success: true, requests });
}

export async function POST(request: Request) {
  const isJson = request.headers.get('content-type')?.includes('application/json');
  const payload = bodySchema.parse(
    isJson ? await request.json() : Object.fromEntries((await request.formData()).entries())
  );
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || !['super_admin', 'admin', 'arena_admin'].includes(context.role)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
  }

  const created = await createApprovalRequest({
    arenaId: payload.arena_id,
    requestedBy: context.id,
    requestType: payload.request_type,
    payload: JSON.parse(payload.payload_json) as Record<string, unknown>,
    notes: payload.notes ?? null,
  });

  if (!created) {
    return NextResponse.json({ success: false, message: 'Failed to create request' }, { status: 400 });
  }

  if (!isJson) {
    return NextResponse.redirect(new URL('/fg-admin/platform/slots?requested=1', request.url));
  }

  return NextResponse.json({ success: true, requestId: created.id });
}
