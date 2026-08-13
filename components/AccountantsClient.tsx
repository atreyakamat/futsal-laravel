'use client';

import { useState } from 'react';

interface Accountant {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

export default function AccountantsClient({ initialAccountants }: { initialAccountants: Accountant[] }) {
  const [accountants, setAccountants] = useState(initialAccountants);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState<{ email: string; tempPassword: string } | null>(null);

  const refresh = async () => {
    const res = await fetch('/api/fg-admin/super-admin/accountants');
    const data = await res.json();
    if (data.success) setAccountants(data.data);
  };

  const createAccountant = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setCredentials(null);
    try {
      const res = await fetch('/api/fg-admin/super-admin/accountants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (data.success) {
        setCredentials(data.data.credentials);
        setName('');
        setEmail('');
        await refresh();
      } else {
        setError(data.message || 'Failed to create accountant');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const deactivate = async (id: number) => {
    if (!confirm('Deactivate this accountant account?')) return;
    await fetch(`/api/fg-admin/super-admin/accountants?id=${id}`, { method: 'DELETE' });
    await refresh();
  };

  return (
    <div className="space-y-10">
      <div className="glass-card !p-8">
        <h2 className="text-lg font-black uppercase tracking-tighter italic mb-6">Add Accountant</h2>
        <form onSubmit={createAccountant} className="space-y-4">
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
          {error && <div className="px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-bold">{error}</div>}
          {credentials && (
            <div className="px-4 py-3 rounded-xl border border-primary/20 bg-primary/5 text-primary text-xs font-bold space-y-1">
              <p>Account created — share these credentials securely:</p>
              <p>Email: {credentials.email}</p>
              <p>Temporary Password: {credentials.tempPassword}</p>
            </div>
          )}
          <button type="submit" disabled={loading} className="btn-primary !py-3 !px-6 !text-xs">
            {loading ? 'CREATING...' : 'CREATE ACCOUNTANT'}
          </button>
        </form>
      </div>

      <div className="glass-card !p-8">
        <h2 className="text-lg font-black uppercase tracking-tighter italic mb-6">Accountants ({accountants.length})</h2>
        <div className="space-y-2">
          {accountants.map((a) => (
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
          {accountants.length === 0 && <p className="text-xs text-white/30 text-center py-8">No accountants yet.</p>}
        </div>
      </div>
    </div>
  );
}
