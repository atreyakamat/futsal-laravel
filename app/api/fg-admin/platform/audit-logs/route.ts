import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/admin';
import { query } from '@/lib/domain';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const admin = await requireSuperAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const auditLogs = await query('SELECT * FROM payment_audit_logs ORDER BY created_at DESC LIMIT 50', []);
    return NextResponse.json({ success: true, logs: auditLogs });
  } catch (error) {
    console.error('Audit logs API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
