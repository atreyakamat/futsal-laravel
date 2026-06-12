import { NextResponse } from 'next/server';
import { getSystemAuditLogs } from '@/lib/super-admin';
import { readSuperAdminId } from '@/lib/session';

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
