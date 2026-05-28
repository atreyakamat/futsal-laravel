import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminContext, resolveApprovalRequest } from '@/lib/admin';
import { readAuthUserId } from '@/lib/session';

const bodySchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  reason: z.string().max(500).optional().nullable(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isJson = request.headers.get('content-type')?.includes('application/json');
  const payload = bodySchema.parse(
    isJson ? await request.json() : Object.fromEntries((await request.formData()).entries())
  );
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || context.role !== 'super_admin') {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
  }

  await resolveApprovalRequest({
    requestId: Number(id),
    decisionBy: context.id,
    decision: payload.decision,
    reason: payload.reason ?? null,
  });

  if (!isJson) {
    return NextResponse.redirect(new URL('/admin/approvals?updated=1', request.url));
  }

  return NextResponse.json({ success: true });
}
