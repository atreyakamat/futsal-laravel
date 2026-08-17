'use client';

import { useState } from 'react';

// Reuses the existing PUT /api/dashboard/profile endpoint — it already
// handles the super_admin case correctly (super_admins.id vs users.id,
// uniqueness check, syncing both super_admins and users tables). Only name
// is required alongside email by that endpoint, so it's resubmitted as-is.
export default function ChangeSuperAdminEmailForm({ currentName, currentEmail }: { currentName: string; currentEmail: string }) {
  const [email, setEmail] = useState(currentEmail);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Email address is required.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/dashboard/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: currentName, email: trimmedEmail, customer_mobile: '' }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setSuccess('Email updated successfully.');
        if (result.data?.email) setEmail(result.data.email);
      } else {
        setError(result.message || 'Failed to update email');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-8 border-b border-white/5 space-y-4">
      <h2 className="text-2xl font-black uppercase italic">Super Admin Email</h2>
      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
        This is also the login email used on the admin sign-in page.
      </p>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-bold uppercase tracking-widest">
          {success}
        </div>
      )}

      <input
        type="email"
        className="input-field"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="admin@example.com"
        required
        disabled={saving}
      />
      <button className="btn-primary" type="submit" disabled={saving}>
        {saving ? 'SAVING...' : 'Update Super Admin Email'}
      </button>
    </form>
  );
}
