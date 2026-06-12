'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CustomerProfilePage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/dashboard/profile');
        if (!res.ok) {
          throw new Error('Failed to load profile. Are you logged in?');
        }
        const result = await res.json();
        if (result.success && result.data) {
          setName(result.data.name);
          setEmail(result.data.email);
          setMobile(result.data.customer_mobile || '');
        } else {
          throw new Error(result.message || 'Failed to parse profile data');
        }
      } catch (err: any) {
        setError(err.message || 'Error loading profile');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !mobile) {
      setError('Name and mobile number are required.');
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch('/api/dashboard/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, customer_mobile: mobile }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setSuccess('Profile updated successfully!');
      } else {
        setError(result.message || 'Failed to update profile');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-32 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest italic animate-pulse">Loading profile data...</p>
        </div>
      </div>
    );
  }

  if (error && !name) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20">
        <div className="glass-card text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto">
            <span className="material-symbols-outlined text-3xl">error</span>
          </div>
          <h2 className="text-2xl font-black uppercase italic">Access Denied</h2>
          <p className="text-white/40 text-sm max-w-md mx-auto">{error}</p>
          <Link href="/login" className="btn-primary inline-block">
            GO TO LOGIN
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-20 space-y-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic mb-2">
            My <span className="text-primary text-stroke">Profile</span>
          </h1>
          <p className="label-classic !ml-0 font-bold">Manage your customer contact details</p>
        </div>
        <Link href="/dashboard" className="btn-secondary !py-2 !px-4 !rounded-xl text-[10px]">
          ← DASHBOARD
        </Link>
      </div>

      <div className="glass-card">
        <form onSubmit={handleUpdate} className="space-y-6 max-w-xl">
          <h2 className="text-2xl font-black uppercase italic text-primary">Personal Details</h2>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
            These details are used when generating entry tickets and confirmations.
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

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="label-classic">Full Name</label>
              <input
                type="text"
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                disabled={updating}
              />
            </div>

            <div className="space-y-2">
              <label className="label-classic">Email Address</label>
              <input
                type="email"
                className="input-field opacity-60 cursor-not-allowed"
                value={email}
                disabled
              />
              <span className="text-[9px] text-white/20 uppercase tracking-widest font-bold">Email address cannot be changed</span>
            </div>

            <div className="space-y-2">
              <label className="label-classic">Mobile Number</label>
              <input
                type="tel"
                className="input-field"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="+919999999999"
                required
                disabled={updating}
              />
            </div>
          </div>

          <button className="btn-primary w-full" type="submit" disabled={updating}>
            {updating ? 'SAVING CHANGES...' : 'SAVE CHANGES'}
          </button>
        </form>
      </div>
    </div>
  );
}
