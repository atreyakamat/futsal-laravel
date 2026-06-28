import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminContext, createApprovalRequest } from '@/lib/admin';
import { readAuthUserId } from '@/lib/session';

const bodySchema = z.object({
  newPassword: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const userId = await readAuthUserId();
    const context = await getAdminContext(userId);

    if (!context || !['arena_admin', 'security'].includes(context.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const payload = bodySchema.parse(await request.json());

    if (!context.arenaId) {
      return NextResponse.json({ success: false, message: 'Arena assignment missing' }, { status: 400 });
    }

    // Create approval request for super admin
    await createApprovalRequest({
      arenaId: context.arenaId,
      requestedBy: context.id,
      requestType: 'password_change',
      payload: {
        userId: context.id,
        role: context.role,
        newPassword: payload.newPassword,
      },
      notes: `Password change request for ${context.role} - ${context.name}`,
    });

    return NextResponse.json({ success: true, message: 'Password change request submitted for approval' });
  } catch (error) {
    console.error('Password change request error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'Invalid input', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
