import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { updateSuperAdminPassword, getSuperAdmin, logAuditAction } from '@/lib/super-admin';
import * as bcrypt from 'bcryptjs';

const changePasswordSchema = z.object({
  current_password: z.string().min(6),
  new_password: z.string().min(6),
  confirm_password: z.string().min(6),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

async function readSuperAdminId() {
  const cookieStore = await cookies();
  if (cookieStore.get('fg_auth_role')?.value !== 'super_admin') {
    return null;
  }
  const value = cookieStore.get('fg_auth_user')?.value;
  return value ? Number(value) : null;
}

export async function PUT(request: Request) {
  try {
    const superAdminId = await readSuperAdminId();

    if (!superAdminId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const isJson = request.headers.get('content-type')?.includes('application/json');
    const payload = changePasswordSchema.parse(
      isJson ? await request.json() : Object.fromEntries((await request.formData()).entries())
    );

    // Get super admin
    const superAdmin = await getSuperAdmin(superAdminId);

    if (!superAdmin) {
      return NextResponse.json(
        { success: false, message: 'Super admin not found' },
        { status: 404 }
      );
    }

    // Verify current password
    const isValidCurrentPassword = await bcrypt.compare(
      payload.current_password,
      superAdmin.password_hash
    );

    if (!isValidCurrentPassword) {
      return NextResponse.json(
        { success: false, message: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Update password
    const result = await updateSuperAdminPassword(superAdminId, payload.new_password);

    // Log audit action
    await logAuditAction(
      superAdminId,
      'CHANGE_PASSWORD',
      'super_admin',
      superAdminId,
      { email: result.email },
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
      data: { email: result.email },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Change password error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const superAdminId = await readSuperAdminId();

    if (!superAdminId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const superAdmin = await getSuperAdmin(superAdminId);

    if (!superAdmin) {
      return NextResponse.json(
        { success: false, message: 'Super admin not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: superAdmin.id,
        email: superAdmin.email,
        role: 'super_admin',
        is_active: superAdmin.is_active,
        last_login: superAdmin.last_login,
      },
    });
  } catch (error) {
    console.error('Fetch settings error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
