'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type PersonalProfile = {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
};

type ArenaProfile = {
  id: number;
  name: string;
  slug: string;
  address: string | null;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: string;
};

export default function ArenaAdminSettingsPage() {
  const [profile, setProfile] = useState<PersonalProfile | null>(null);
  const [arena, setArena] = useState<ArenaProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Password form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        setError('');
        const [profileRes, arenaRes] = await Promise.all([
          fetch('/api/arena-admin/settings'),
          fetch('/api/arena-admin/arena')
        ]);

        if (!profileRes.ok || !arenaRes.ok) {
          throw new Error('Failed to load profile or arena settings. Are you logged in?');
        }

        const profileData = await profileRes.json();
        const arenaData = await arenaRes.json();

        if (profileData.success && arenaData.success) {
          setProfile(profileData.data);
          setArena(arenaData.data);
        } else {
          throw new Error(profileData.message || arenaData.message || 'Failed to fetch settings');
        }
      } catch (e: any) {
        setError(e.message || 'Error loading settings data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwdError('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPwdError('New password must be at least 6 characters');
      return;
    }

    setPwdLoading(true);

    try {
      const res = await fetch('/api/arena-admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setPwdSuccess('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPwdError(data.message || 'Failed to change password');
      }
    } catch (err) {
      setPwdError('Error processing request. Please try again.');
    } finally {
      setPwdLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-32 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest italic animate-pulse">Loading profile settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20">
        <div className="glass-card text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto">
            <span className="material-symbols-outlined text-3xl">error</span>
          </div>
          <h2 className="text-2xl font-black uppercase italic">Access Denied</h2>
          <p className="text-white/40 text-sm max-w-md mx-auto">{error}</p>
          <Link href="/admin/arena-admin-login" className="btn-primary inline-block">
            GO TO LOGIN
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-20 space-y-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
            Facility <span className="text-primary text-stroke">Settings</span>
          </h1>
          <p className="label-classic !ml-0">Manage security credentials and view facility metadata</p>
        </div>
        <Link href="/arena-admin/dashboard" className="btn-secondary !py-2 !px-4 !rounded-xl text-[10px]">
          ← DASHBOARD
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Profile Card */}
        <div className="space-y-8">
          <div className="glass-card space-y-6">
            <h2 className="text-2xl font-black uppercase italic text-primary">Manager Profile</h2>
            <div className="grid gap-6">
              <div>
                <span className="label-classic !ml-0 mb-1">Full Name</span>
                <span className="text-lg font-black text-white uppercase italic tracking-tight">
                  {[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Arena Manager'}
                </span>
              </div>
              <div>
                <span className="label-classic !ml-0 mb-1">Email Address</span>
                <span className="text-sm font-black text-white">{profile?.email}</span>
              </div>
              <div>
                <span className="label-classic !ml-0 mb-1">Authorized Role</span>
                <span className="text-xs font-bold text-primary uppercase tracking-widest px-3 py-1 bg-primary/10 border border-primary/20 rounded-full inline-block">
                  {profile?.role}
                </span>
              </div>
            </div>
          </div>

          <div className="glass-card space-y-6">
            <h2 className="text-2xl font-black uppercase italic">Turf Details</h2>
            <div className="grid gap-6">
              <div>
                <span className="label-classic !ml-0 mb-1">Turf Name</span>
                <span className="text-lg font-black text-white uppercase italic tracking-tight">{arena?.name}</span>
              </div>
              <div>
                <span className="label-classic !ml-0 mb-1">Slug</span>
                <span className="text-xs font-bold text-white/50">{arena?.slug}</span>
              </div>
              <div>
                <span className="label-classic !ml-0 mb-1">Location / Address</span>
                <span className="text-sm text-white/80 leading-relaxed font-medium">{arena?.address || 'Not specified'}</span>
              </div>
              {arena?.description && (
                <div>
                  <span className="label-classic !ml-0 mb-1">Description</span>
                  <p className="text-xs text-white/60 leading-relaxed">{arena.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="label-classic !ml-0 mb-1">Contact Phone</span>
                  <span className="text-xs font-bold text-white">{arena?.contact_phone || 'None'}</span>
                </div>
                <div>
                  <span className="label-classic !ml-0 mb-1">Contact Email</span>
                  <span className="text-xs font-bold text-white">{arena?.contact_email || 'None'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Password update form */}
        <form onSubmit={handlePasswordChange} className="glass-card space-y-6 self-start">
          <h2 className="text-2xl font-black uppercase italic text-primary">Change Password</h2>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
            Ensure your account uses a long, random password to stay secure.
          </p>

          {pwdError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest">
              {pwdError}
            </div>
          )}

          {pwdSuccess && (
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-bold uppercase tracking-widest">
              {pwdSuccess}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="label-classic">Current Password</label>
              <input
                type="password"
                className="input-field"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={pwdLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="label-classic">New Password</label>
              <input
                type="password"
                className="input-field"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={pwdLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="label-classic">Confirm New Password</label>
              <input
                type="password"
                className="input-field"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={pwdLoading}
              />
            </div>
          </div>

          <button className="btn-primary w-full" type="submit" disabled={pwdLoading}>
            {pwdLoading ? 'CHANGING PASSWORD...' : 'UPDATE PASSWORD'}
          </button>
        </form>
      </div>
    </div>
  );
}
