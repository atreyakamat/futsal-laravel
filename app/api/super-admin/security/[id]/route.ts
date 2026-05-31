import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { removeSecurityStaff, logAuditAction } from '@/lib/super-admin';

async function readSuperAdminId() {
  const cookieStore = await cookies();
  if (cookieStore.get('fg_auth_role')?.value !== 'super_admin') {
    return null;
  }
  const value = cookieStore.get('fg_auth_user')?.value;
  return value ? Number(value) : null;
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const superAdminId = await readSuperAdminId();

    if (!superAdminId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const arenaId = searchParams.get('arena_id');

    if (!arenaId) {
      return NextResponse.json(
        { success: false, message: 'arena_id parameter required' },
        { status: 400 }
      );
    }

    const result = await removeSecurityStaff(Number(arenaId), Number(params.id));

    // Log audit action
    await logAuditAction(
      superAdminId,
      'DELETE_SECURITY_STAFF',
      'security_staff',
      result.id,
      { is_active: false },
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({
      success: true,
      message: 'Security staff removed successfully',
      data: result,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 404 }
      );
    }

    console.error('Remove security staff error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
