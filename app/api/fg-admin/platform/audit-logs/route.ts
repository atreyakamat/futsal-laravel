import { NextResponse } from 'next/server';
import { getAdminContext } from '@/lib/admin';
import { readAuthUserId } from '@/lib/session';
import { query } from '@/lib/domain';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const userId = await readAuthUserId();
    const context = await getAdminContext(userId);

    if (!context || context.role !== 'super_admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    // Fetch system audit logs (Super Admin actions)
    const systemLogs = await query(`
      SELECT 
        s.id,
        s.action,
        s.entity_type,
        s.entity_id::text as entity_id,
        s.changes as after_json,
        NULL as before_json,
        s.created_at,
        sa.email as actor_email,
        'Super Admin' as actor_role,
        'Platform' as arena_name
      FROM system_audit_logs s
      LEFT JOIN super_admins sa ON s.super_admin_id = sa.id
      ORDER BY s.created_at DESC
      LIMIT 100
    `);

    // Fetch admin audit logs (Arena Admin actions)
    const adminLogs = await query(`
      SELECT 
        a.id,
        a.action,
        a.entity_type,
        a.entity_id,
        a.after_json,
        a.before_json,
        a.created_at,
        u.email as actor_email,
        u.role as actor_role,
        ar.name as arena_name
      FROM admin_audit_logs a
      LEFT JOIN users u ON a.actor_user_id = u.id
      LEFT JOIN arenas ar ON a.arena_id = ar.id
      ORDER BY a.created_at DESC
      LIMIT 100
    `);

    // Merge and sort
    const allLogs = [...(systemLogs || []), ...(adminLogs || [])] as any[];
    allLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    // Take top 100
    const finalLogs = allLogs.slice(0, 100);

    return NextResponse.json({ success: true, logs: finalLogs });
  } catch (error) {
    console.error('Audit logs API Error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}