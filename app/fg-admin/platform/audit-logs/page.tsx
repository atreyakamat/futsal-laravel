import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { query } from '@/lib/domain';

export default async function AuditLogsPage() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('fg_session_id')?.value;
  const userIdRaw = cookieStore.get('fg_auth_user')?.value;

  if (!sessionId || !userIdRaw) {
    redirect('/fg-admin/login');
  }

  // Fetch system audit logs (Super Admin actions)
  const systemLogs = await query<any>(`
    SELECT 
      s.id as log_id,
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
  const adminLogs = await query<any>(`
    SELECT 
      a.id as log_id,
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
  const logs = allLogs.slice(0, 100);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <a href="/fg-admin/platform/super-admin" className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
            <span className="material-symbols-outlined text-white">arrow_back</span>
          </a>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">System <span className="text-primary">Audit Logs</span></h1>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Platform Security & Tracking</p>
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs font-bold uppercase tracking-widest text-gray-500 bg-white/5">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Actor</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Arena</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Entity</th>
                  <th className="p-4">Details</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {logs.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-gray-500 font-bold uppercase tracking-widest">No audit logs found.</td></tr>
                ) : (
                  logs.map((log, i) => (
                    <tr key={`${log.log_id}-${log.actor_role}-${i}`} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4 whitespace-nowrap text-gray-400 font-mono text-xs">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="p-4 font-bold text-white">{log.actor_email || 'System'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded ${log.actor_role === 'Super Admin' ? 'bg-primary/20 text-primary' : 'bg-blue-500/20 text-blue-400'}`}>
                          {log.actor_role || 'Unknown'}
                        </span>
                      </td>
                      <td className="p-4 text-gray-300">{log.arena_name || '-'}</td>
                      <td className="p-4">
                        <span className="text-green-400 font-bold uppercase tracking-wider text-xs">{log.action}</span>
                      </td>
                      <td className="p-4 text-gray-300">
                        {log.entity_type} <span className="text-gray-500">#{log.entity_id}</span>
                      </td>
                      <td className="p-4 max-w-xs">
                        <div className="max-h-20 overflow-y-auto custom-scrollbar text-[10px] font-mono bg-black/50 p-2 rounded text-gray-400">
                          {log.after_json ? JSON.stringify(JSON.parse(log.after_json), null, 2) : 'No details'}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
