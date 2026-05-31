import { readAuthUserId } from '@/lib/session';
import { getAdminContext, listArenas } from '@/lib/admin';
import { redirect } from 'next/navigation';

export default async function AdminCredentialsPage() {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context) {
    redirect('/admin/dashboard');
  }

  const arenas = context.role === 'super_admin' ? await listArenas() : [];

  return (
    <div className="max-w-3xl mx-auto px-6 py-20 space-y-10">
      <div>
        <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
          Account <span className="text-primary text-stroke">Security</span>
        </h1>
        <p className="label-classic !ml-0">Update your login password and arena security passcode</p>
      </div>

      <form action="/api/admin/credentials" method="POST" className="glass-card space-y-6">
        <h2 className="text-2xl font-black uppercase italic">Change Password</h2>
        <input name="current_password" type="password" className="input-field" placeholder="Current password" />
        <input name="new_password" type="password" className="input-field" placeholder="New password" />
        <button className="btn-primary" type="submit">Update Password</button>
      </form>

      {(context.role === 'super_admin' || context.role === 'arena_admin') && (
        <form action="/api/admin/credentials" method="POST" className="glass-card space-y-6">
          <h2 className="text-2xl font-black uppercase italic">Security Passcode</h2>
          {context.role === 'super_admin' && arenas?.length > 0 && (
            <select name="arena_id" className="input-field" defaultValue={context.arenaId ?? arenas[0]?.id}>
              {arenas.map((arena) => (
                <option key={arena.id} value={arena.id}>{arena.name}</option>
              ))}
            </select>
          )}
          <input name="security_passcode" type="password" className="input-field" placeholder="New security passcode" />
          <button className="btn-primary" type="submit">Update Passcode</button>
        </form>
      )}
    </div>
  );
}
