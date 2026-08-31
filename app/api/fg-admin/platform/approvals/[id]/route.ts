import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminContext, hasArenaAccess, resolveApprovalRequest } from '@/lib/admin';
import { readAuthUserId } from '@/lib/session';
import { queryOne } from '@/lib/db';

const bodySchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  reason: z.string().max(500).optional().nullable(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isJson = request.headers.get('content-type')?.includes('application/json');
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || (context.role !== 'super_admin' && context.role !== 'arena_admin')) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
  }

  try {
    const payload = bodySchema.parse(
      isJson ? await request.json() : Object.fromEntries((await request.formData()).entries())
    );

    // A scoped arena_admin may only decide requests filed against one of
    // their assigned turfs — otherwise they could approve (and thereby
    // create/discount) a booking on a turf they have no authority over.
    const targetRequest = await queryOne<{ arena_id: number | null }>(
      'SELECT arena_id FROM approval_requests WHERE id = ? LIMIT 1',
      [Number(id)]
    );
    if (!targetRequest) {
      return NextResponse.json({ success: false, message: 'Approval request not found' }, { status: 404 });
    }
    if (!hasArenaAccess(context, targetRequest.arena_id)) {
      return NextResponse.json({ success: false, message: 'You are not authorized for this arena.' }, { status: 403 });
    }

    await resolveApprovalRequest({
      requestId: Number(id),
      decisionBy: context.id,
      decision: payload.decision,
      reason: payload.reason ?? null,
    });

    if (!isJson) {
      return NextResponse.redirect(new URL('/fg-admin/platform/approvals?updated=1', request.url));
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error resolving approval request:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (!isJson) {
      return NextResponse.redirect(
        new URL(`/fg-admin/platform/approvals?error=${encodeURIComponent(message)}`, request.url)
      );
    }

    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
