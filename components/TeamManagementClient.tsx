'use client';

import { useState } from 'react';

type StaffRole = 'super_admin' | 'manager' | 'arena_admin' | 'security' | 'accountant';

interface StaffRow {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  created_at: string;
  role: StaffRole;
  arena_id: number | null;
  arena_name: string | null;
  phone: string | null;
  arena_ids: number[];
}

interface Arena {
  id: number;
  name: string;
}

const ROLE_LABELS: Record<StaffRole, string> = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  arena_admin: 'Admin',
  security: 'Security',
  accountant: 'Accountant',
};

type CreatableRole = 'manager' | 'arena_admin' | 'security' | 'accountant';

const CREATE_ENDPOINT: Record<CreatableRole, string> = {
  manager: '/api/fg-admin/super-admin/admins',
  arena_admin: '/api/fg-admin/super-admin/arena-admins',
  security: '/api/fg-admin/super-admin/security',
  accountant: '/api/fg-admin/super-admin/accountants',
};

export default function TeamManagementClient({
  initialStaff,
  arenas,
  permissionsByStaffId,
}: {
  initialStaff: StaffRow[];
  arenas: Arena[];
  permissionsByStaffId: Record<number, { canVerifyTicket: boolean; canConfirmEntry: boolean }>;
}) {
  const [staff, setStaff] = useState(initialStaff);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffRow | null>(null);

  const refresh = async () => {
    // Simplest correct refresh: re-fetch each role's list and stitch back
    // together client-side, since there's no single combined GET endpoint.
    const [managers, arenaAdmins, security, accountants] = await Promise.all([
      Promise.all(arenas.map((a) => fetch(`/api/fg-admin/super-admin/admins?arena_id=${a.id}`).then((r) => r.json()))),
      fetch('/api/fg-admin/super-admin/arena-admins').then((r) => r.json()),
      Promise.all(arenas.map((a) => fetch(`/api/fg-admin/super-admin/security?arena_id=${a.id}`).then((r) => r.json()))),
      fetch('/api/fg-admin/super-admin/accountants').then((r) => r.json()),
    ]);

    const arenaById = new Map(arenas.map((a) => [a.id, a.name]));
    const rows: StaffRow[] = [];

    managers.forEach((res, i) => {
      if (res.success) {
        for (const m of res.data) {
          rows.push({ ...m, role: 'manager', arena_id: arenas[i].id, arena_name: arenaById.get(arenas[i].id) || null, phone: null, arena_ids: [] });
        }
      }
    });
    if (arenaAdmins.success) {
      for (const a of arenaAdmins.data) {
        rows.push({
          ...a,
          role: 'arena_admin',
          arena_id: null,
          arena_name: (a.arena_ids || []).map((id: number) => arenaById.get(id)).filter(Boolean).join(', ') || null,
          phone: null,
          arena_ids: a.arena_ids || [],
        });
      }
    }
    security.forEach((res, i) => {
      if (res.success) {
        for (const s of res.data) {
          rows.push({ ...s, role: 'security', arena_id: arenas[i].id, arena_name: arenaById.get(arenas[i].id) || null, arena_ids: [] });
        }
      }
    });
    if (accountants.success) {
      for (const ac of accountants.data) {
        rows.push({ ...ac, role: 'accountant', arena_id: null, arena_name: null, phone: null, arena_ids: [] });
      }
    }

    rows.sort((a, b) => a.role.localeCompare(b.role) || (b.created_at || '').localeCompare(a.created_at || ''));
    setStaff((prev) => [...prev.filter((s) => s.role === 'super_admin'), ...rows]);
  };

  return (
    <div className="space-y-8">
      <div className="glass-card !p-8 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black uppercase tracking-tighter italic">{staff.length} Staff Accounts</h2>
          <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">Manager · Security · Admin (one or multiple turfs) · Accountant</p>
        </div>
        <button onClick={() => setShowAddForm(true)} className="btn-primary !py-3 !px-6 !text-xs">
          + ADD STAFF
        </button>
      </div>

      {showAddForm && (
        <AddStaffForm arenas={arenas} onClose={() => setShowAddForm(false)} onCreated={refresh} />
      )}

      <div className="grid gap-4">
        {staff.map((s) => {
          const perms = s.role === 'security' ? permissionsByStaffId[s.id] : null;
          const fullName = [s.first_name, s.last_name].filter(Boolean).join(' ') || s.email;
          return (
            <div key={`${s.role}-${s.id}`} className="glass-card !p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="grid md:grid-cols-3 gap-6 flex-1">
                <div>
                  <span className="label-classic !ml-0 mb-1">Name</span>
                  <span className="text-lg font-black uppercase italic block">{fullName}</span>
                  <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{s.email}</span>
                </div>
                <div>
                  <span className="label-classic !ml-0 mb-1">Role</span>
                  <span className="pill-status">{ROLE_LABELS[s.role] || s.role}</span>
                </div>
                <div>
                  <span className="label-classic !ml-0 mb-1">Turf(s)</span>
                  <span className="text-sm font-black text-white uppercase italic block">
                    {s.arena_name || (s.role === 'manager' || s.role === 'security' ? 'Unassigned' : s.role === 'arena_admin' ? 'All Turfs' : '—')}
                  </span>
                  {perms && (
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest block mt-1">
                      {perms.canVerifyTicket ? 'Verify ✓' : 'Verify ✗'} · {perms.canConfirmEntry ? 'Entry ✓' : 'Entry ✗'}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`pill-status ${s.is_active ? 'border-primary/20 text-primary' : 'border-red-500/20 text-red-400'}`}>
                  {s.is_active ? 'Active' : 'Inactive'}
                </span>
                {s.role !== 'super_admin' && (
                  <button
                    onClick={() => setEditingStaff(s)}
                    className="btn-secondary !py-2 !px-4 !rounded-lg text-[10px]"
                  >
                    EDIT
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {staff.length === 0 && (
          <div className="glass-card text-center py-20 text-white/40">No staff accounts found.</div>
        )}
      </div>

      {editingStaff && (
        <EditStaffModal
          staff={editingStaff}
          arenas={arenas}
          onClose={() => setEditingStaff(null)}
          onSaved={async () => {
            setEditingStaff(null);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

function AddStaffForm({ arenas, onClose, onCreated }: { arenas: Arena[]; onClose: () => void; onCreated: () => Promise<void> }) {
  const [role, setRole] = useState<CreatableRole>('manager');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [arenaId, setArenaId] = useState<number | ''>('');
  const [arenaIds, setArenaIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState<{ email: string; tempPassword: string | null; message?: string } | null>(null);

  const toggleArenaId = (id: number) => {
    setArenaIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setCredentials(null);

    if ((role === 'manager' || role === 'security') && !arenaId) {
      setError('Pick a turf for this role.');
      setLoading(false);
      return;
    }

    const body: Record<string, unknown> = { name, email, password: password || undefined };
    if (role === 'manager' || role === 'security') body.arena_id = arenaId;
    if (role === 'security') { body.phone = phone || undefined; body.permissions = ['verify_ticket', 'confirm_entry']; }
    if (role === 'arena_admin') body.arena_ids = arenaIds;

    try {
      const res = await fetch(CREATE_ENDPOINT[role], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setCredentials(data.data.credentials || data.data.credential);
        setName('');
        setEmail('');
        setPhone('');
        setPassword('');
        setArenaId('');
        setArenaIds([]);
        await onCreated();
      } else {
        setError(data.message || 'Failed to create account');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card !p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-black uppercase tracking-tighter italic">Add Staff</h2>
        <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label-classic !ml-0 block mb-2">Role</label>
          <div className="flex flex-wrap gap-2">
            {(['manager', 'security', 'arena_admin', 'accountant'] as CreatableRole[]).map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => { setRole(r); setArenaId(''); setArenaIds([]); }}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-colors ${
                  role === r ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 text-white/50 hover:border-white/30'
                }`}
              >
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>
          {role === 'manager' && <p className="text-[10px] text-white/30 mt-2">Operates exactly one turf's dashboard.</p>}
          {role === 'security' && <p className="text-[10px] text-white/30 mt-2">Scans/checks in at exactly one turf.</p>}
          {role === 'arena_admin' && <p className="text-[10px] text-white/30 mt-2">Pick zero turfs for platform-wide access, or one/several specific turfs — they switch between assigned turf dashboards.</p>}
          {role === 'accountant' && <p className="text-[10px] text-white/30 mt-2">Read-only financial view across every turf.</p>}
        </div>

        {(role === 'manager' || role === 'security') && (
          <div>
            <label className="label-classic !ml-0 block mb-2">Turf</label>
            <select
              required
              value={arenaId}
              onChange={(e) => setArenaId(e.target.value ? Number(e.target.value) : '')}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm text-white font-bold outline-none focus:border-primary/50"
            >
              <option value="">Select a turf…</option>
              {arenas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}

        {role === 'arena_admin' && (
          <div>
            <label className="label-classic !ml-0 block mb-2">Turfs <span className="text-white/30 normal-case">(none selected = platform-wide)</span></label>
            <div className="grid sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 rounded-lg border border-white/10 bg-black/20">
              {arenas.map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-xs font-bold text-white/70 cursor-pointer">
                  <input type="checkbox" checked={arenaIds.includes(a.id)} onChange={() => toggleArenaId(a.id)} className="accent-primary" />
                  {a.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label-classic !ml-0 block mb-2">Full Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm text-white font-bold outline-none focus:border-primary/50" />
          </div>
          <div>
            <label className="label-classic !ml-0 block mb-2">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm text-white font-bold outline-none focus:border-primary/50" />
          </div>
        </div>

        {role === 'security' && (
          <div>
            <label className="label-classic !ml-0 block mb-2">Phone <span className="text-white/30 normal-case">(optional)</span></label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm text-white font-bold outline-none focus:border-primary/50" />
          </div>
        )}

        <div>
          <label className="label-classic !ml-0 block mb-2">Password <span className="text-white/30 normal-case">(optional — leave blank to auto-generate a temp password)</span></label>
          <input type="text" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm text-white font-bold outline-none focus:border-primary/50" />
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
          {loading ? 'CREATING...' : 'CREATE ACCOUNT'}
        </button>
      </form>
    </div>
  );
}

function EditStaffModal({
  staff,
  arenas,
  onClose,
  onSaved,
}: {
  staff: StaffRow;
  arenas: Arena[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState([staff.first_name, staff.last_name].filter(Boolean).join(' '));
  const [email, setEmail] = useState(staff.email);
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(staff.is_active);
  const [arenaId, setArenaId] = useState<number | ''>(staff.arena_id ?? '');
  const [arenaIds, setArenaIds] = useState<number[]>(staff.arena_ids);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleArenaId = (id: number) => {
    setArenaIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const isAccountant = staff.role === 'accountant';
  const endpoint = isAccountant
    ? `/api/fg-admin/super-admin/accountants/${staff.id}`
    : `/api/fg-admin/super-admin/admins/${staff.id}`;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const body: Record<string, unknown> = { name, email, is_active: isActive };
    if (password) body.password = password;
    if (staff.role === 'manager' && arenaId) body.arena_id = arenaId;
    if (staff.role === 'arena_admin') body.arena_ids = arenaIds;

    try {
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        await onSaved();
      } else {
        setError(data.message || 'Failed to save changes');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 overflow-y-auto">
      <div className="glass-card !p-8 max-w-lg w-full space-y-6 my-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black uppercase tracking-tighter italic">Edit {ROLE_LABELS[staff.role]}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={save} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label-classic !ml-0 block mb-2">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm text-white font-bold outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="label-classic !ml-0 block mb-2">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm text-white font-bold outline-none focus:border-primary/50" />
            </div>
          </div>

          {staff.role === 'manager' && (
            <div>
              <label className="label-classic !ml-0 block mb-2">Turf</label>
              <select value={arenaId} onChange={(e) => setArenaId(e.target.value ? Number(e.target.value) : '')} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm text-white font-bold outline-none focus:border-primary/50">
                {arenas.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          {staff.role === 'arena_admin' && (
            <div>
              <label className="label-classic !ml-0 block mb-2">Turfs <span className="text-white/30 normal-case">(none selected = platform-wide)</span></label>
              <div className="grid sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 rounded-lg border border-white/10 bg-black/20">
                {arenas.map((a) => (
                  <label key={a.id} className="flex items-center gap-2 text-xs font-bold text-white/70 cursor-pointer">
                    <input type="checkbox" checked={arenaIds.includes(a.id)} onChange={() => toggleArenaId(a.id)} className="accent-primary" />
                    {a.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="label-classic !ml-0 block mb-2">Reset Password <span className="text-white/30 normal-case">(leave blank to keep current password)</span></label>
            <input type="text" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm text-white font-bold outline-none focus:border-primary/50" />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 accent-primary" />
            <span className="text-sm font-bold text-white">Account Active</span>
          </label>

          {error && <div className="px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-bold">{error}</div>}

          <div className="flex gap-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 !py-3">CANCEL</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 !py-3">{loading ? 'SAVING...' : 'SAVE CHANGES'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
