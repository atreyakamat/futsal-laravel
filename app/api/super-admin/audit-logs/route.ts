import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSystemAuditLogs } from '@/lib/super-admin';

async function readSuperAdminId() {
  const cookieStore = await cookies();
  if (cookieStore.get('fg_auth_role')?.value !== 'super_admin') {
    return null;
  }
  const value = cookieStore.get('fg_auth_user')?.value;
  return value ? Number(value) : null;
}

export async function GET() {
  try {
    const superAdminId = await readSuperAdminId();

    if (!superAdminId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const logs = await getSystemAuditLogs(100);

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('Fetch audit logs error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
