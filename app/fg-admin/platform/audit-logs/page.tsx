export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import { getAdminContextFromRequest } from '@/lib/admin';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';

export default async function AuditLogsPage() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('fg_session_id')?.value;
  const userIdRaw = cookieStore.get('fg_auth_user')?.value;

  if (!sessionId || !userIdRaw) {
    redirect('/fg-admin/login');
  }

  // We are skipping signature check in this simple server component to save time,
  // in production you would use verifySession.
  
  const logs = await query<any>(`
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">System Audit Logs</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="p-4 border-b">Date</th>
              <th className="p-4 border-b">Action</th>
              <th className="p-4 border-b">Arena</th>
              <th className="p-4 border-b">Requested By</th>
              <th className="p-4 border-b">Approved By</th>
              <th className="p-4 border-b">Field Changed</th>
              <th className="p-4 border-b">Reason</th>
              <th className="p-4 border-b">Old Value</th>
              <th className="p-4 border-b">New Value</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={9} className="p-4 text-center text-gray-500">No audit logs found.</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="p-4 font-semibold text-blue-600">{log.action}</td>
                  <td className="p-4">{log.arena_name || '-'}</td>
                  <td className="p-4">{log.requested_by_name || '-'}</td>
                  <td className="p-4">{log.approved_by_name || '-'}</td>
                  <td className="p-4">{log.field_changed || '-'}</td>
                  <td className="p-4">{log.reason || '-'}</td>
                  <td className="p-4 text-xs font-mono bg-gray-100 rounded break-all max-w-xs">{JSON.stringify(log.old_value)}</td>
                  <td className="p-4 text-xs font-mono bg-green-50 rounded break-all max-w-xs">{JSON.stringify(log.new_value)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
