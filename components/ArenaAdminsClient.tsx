'use client';

import { useState } from 'react';

interface ArenaAdmin {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

export default function ArenaAdminsClient({ initialAdmins }: { initialAdmins: ArenaAdmin[] }) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState<{ email: string; tempPassword: string | null; message?: string } | null>(null);

  const refresh = async () => {
    const res = await fetch('/api/fg-admin/super-admin/arena-admins');
    const data = await res.json();
    if (data.success) setAdmins(data.data);
  };

  const createArenaAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setCredentials(null);
    try {
      const res = await fetch('/api/fg-admin/super-admin/arena-admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password: password || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setCredentials(data.data.credentials);
        setName('');
        setEmail('');
        setPassword('');
        await refresh();
      } else {
        setError(data.message || 'Failed to create arena admin');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const deactivate = async (id: number) => {
    if (!confirm('Deactivate this arena admin account?')) return;
    await fetch(`/api/fg-admin/super-admin/arena-admins?id=${id}`, { method: 'DELETE' });
    await refresh();
  };

  return (
    <div className="space-y-10">
      <div className="glass-card !p-8">
        <h2 className="text-lg font-black uppercase tracking-tighter italic mb-6">Add Arena Admin</h2>
        <form onSubmit={createArenaAdmin} className="space-y-4">
          <div>
            <label className="label-classic !ml-0 block mb-2">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm text-white font-bold outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="label-classic !ml-0 block mb-2">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm text-white font-bold outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="label-classic !ml-0 block mb-2">Password <span className="text-white/30 normal-case">(optional — leave blank to auto-generate a temp password)</span></label>
            <input
              type="text"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm text-white font-bold outline-none focus:border-primary/50"
            />
          </div>
          {error && <div className="px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-bold">{error}</div>}
          {credentials && (
            <div className="px-4 py-3 rounded-xl border border-primary/20 bg-primary/5 text-primary text-xs font-bold space-y-1">
              <p>Account created — {credentials.message || 'share these credentials securely'}:</p>
              <p>Email: {credentials.email}</p>
              {credentials.tempPassword && <p>Temporary Password: {credentials.tempPassword}</p>}
            </div>
          )}
          <button type="submit" disabled={loading} className="btn-primary !py-3 !px-6 !text-xs">
            {loading ? 'CREATING...' : 'CREATE ARENA ADMIN'}
          </button>
        </form>
      </div>

      <div className="glass-card !p-8">
        <h2 className="text-lg font-black uppercase tracking-tighter italic mb-6">Arena Admins ({admins.length})</h2>
        <div className="space-y-2">
          {admins.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/5 bg-white/[0.02]">
              <div>
                <span className="text-xs font-black text-white uppercase italic">{[a.first_name, a.last_name].filter(Boolean).join(' ') || a.email}</span>
                <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest ml-3">{a.email}</span>
                {!a.is_active && <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest ml-3">INACTIVE</span>}
              </div>
              {a.is_active && (
                <button
                  onClick={() => deactivate(a.id)}
                  className="btn-secondary !py-2 !px-4 !rounded-lg text-[10px] border-red-500/30 text-red-400"
                >
                  DEACTIVATE
                </button>
              )}
            </div>
          ))}
          {admins.length === 0 && <p className="text-xs text-white/30 text-center py-8">No arena admins yet.</p>}
        </div>
      </div>
    </div>
  );
}
