import { NextResponse } from 'next/server';
import { z } from 'zod';
import { updateAccountant, logAuditAction } from '@/lib/super-admin';
import { readSuperAdminId } from '@/lib/session';

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  is_active: z.boolean().optional(),
  password: z.string().min(6).optional().or(z.literal('')),
});

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const accountantId = Number(params.id);
    const superAdminId = await readSuperAdminId();

    if (!superAdminId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const payload = updateSchema.parse(await request.json());

    await updateAccountant(accountantId, {
      name: payload.name,
      email: payload.email,
      password: payload.password || undefined,
      is_active: payload.is_active,
    });

    await logAuditAction(
      superAdminId,
      'UPDATE_ACCOUNTANT',
      'accountant',
      accountantId,
      { email: payload.email, is_active: payload.is_active, password_reset: Boolean(payload.password) },
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({ success: true, message: 'Accountant updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'Invalid input', errors: error.errors }, { status: 400 });
    }
    console.error('Update accountant error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
