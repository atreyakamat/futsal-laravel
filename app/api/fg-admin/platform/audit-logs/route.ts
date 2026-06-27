import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/admin';
import { query } from '@/lib/domain';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const admin = await requireSuperAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch audit logs with joined user and arena names
    const auditLogs = await query(`
      SELECT a.*,
             u1.name as requested_by_name,
             u2.name as approved_by_name,
             ar.name as arena_name
      FROM system_audit_logs a
      LEFT JOIN users u1 ON a.requested_by = u1.id
      LEFT JOIN super_admins sa ON a.approved_by = sa.id
      LEFT JOIN users u2 ON sa.user_id = u2.id
      LEFT JOIN arenas ar ON a.arena_id = ar.id
      ORDER BY a.created_at DESC
      LIMIT 100
    `);

    return NextResponse.json({ success: true, logs: auditLogs });
  } catch (error) {
    console.error('Audit logs API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}