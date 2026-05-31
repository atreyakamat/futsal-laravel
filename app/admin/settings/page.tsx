import { readAuthUserId } from '@/lib/session';
import { query } from '@/lib/domain';
import { getAdminContext } from '@/lib/admin';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const userId = await readAuthUserId();

  if (!userId) {
    redirect('/admin/login');
  }

  const context = await getAdminContext(userId);
  if (!context || context.role !== 'super_admin') {
    redirect('/admin/dashboard');
  }

  const settings = await query<{
    key: string;
    value: string | null;
    updated_at: string;
  }>('SELECT "key", value, updated_at FROM settings ORDER BY "key" ASC');

  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <div className="mb-12">
        <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
          System <span className="text-primary text-stroke">Settings</span>
        </h1>
        <p className="label-classic !ml-0">Global platform configurations</p>
      </div>

      <div className="glass-card !p-0 overflow-hidden">
        <form action="/api/admin/credentials" method="POST" className="p-8 border-b border-white/5 space-y-4">
          <h2 className="text-2xl font-black uppercase italic">Super Admin Password</h2>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
            Change your super admin password without leaving settings.
          </p>
          <input name="current_password" type="password" className="input-field" placeholder="Current password" />
          <input name="new_password" type="password" className="input-field" placeholder="New password" />
          <button className="btn-primary" type="submit">Update Super Admin Password</button>
        </form>

        <div className="grid divide-y divide-white/5">
          {(settings || []).map((setting) => (
            <div key={setting.key} className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:bg-white/[0.01] transition-colors">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20">
                  <span className="material-symbols-outlined text-2xl">settings_input_component</span>
                </div>
                <div>
                  <span className="label-classic !ml-0 mb-1">{setting.key}</span>
                  <span className="text-lg font-black text-white uppercase italic tracking-tight">{setting.value || 'NOT SET'}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto">
                <button className="btn-secondary !py-2 !px-4 !rounded-xl opacity-50 cursor-not-allowed text-[10px]">
                  UPDATE VALUE
                </button>
              </div>
            </div>
          ))}

          {(!settings || settings?.length === 0) && (
            <div className="p-20 text-center">
              <p className="text-white/20 font-black uppercase tracking-widest italic">No configuration keys found in database.</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex items-start gap-4 p-6 glass rounded-2xl border-white/5 bg-white/[0.01]">
        <span className="material-symbols-outlined text-white/20">info</span>
        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] leading-relaxed">
          Settings values remain read-only in this view. Use credentials above for password updates and DB tooling for key-value changes.
        </p>
      </div>
    </div>
  );
}
