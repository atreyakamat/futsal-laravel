'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Role = 'super_admin' | 'arena_admin' | 'security';

export default function UnifiedLogin() {
  const [activeTab, setActiveTab] = useState<Role>('super_admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    let endpoint = '';
    let redirectPath = '';

    if (activeTab === 'super_admin') {
      endpoint = '/api/auth/super-admin/login';
      redirectPath = '/fg-admin/platform/dashboard';
    } else if (activeTab === 'arena_admin') {
      endpoint = '/api/auth/fg-admin/arena/login';
      redirectPath = '/fg-admin/arena/dashboard';
    } else if (activeTab === 'security') {
      endpoint = '/api/auth/security/login';
      redirectPath = '/fg-admin/security/scan';
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push(redirectPath);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-dark-900/90 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-900/80 to-transparent" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <Link href="/" className="inline-block">
            <span className="text-3xl font-black uppercase tracking-tighter italic">
              Futsal<span className="text-primary">Goa</span>
            </span>
          </Link>
          <h1 className="text-xl font-bold uppercase tracking-widest text-white/50 mt-4">
            Authorized Personnel Only
          </h1>
        </div>

        <div className="glass-card">
          <div className="flex justify-between border-b border-white/10 mb-6">
            <button
              onClick={() => { setActiveTab('super_admin'); setError(''); }}
              className={`pb-4 px-2 text-[10px] font-black tracking-widest uppercase transition-colors ${
                activeTab === 'super_admin' ? 'text-primary border-b-2 border-primary' : 'text-white/40 hover:text-white/80'
              }`}
            >
              Super Admin
            </button>
            <button
              onClick={() => { setActiveTab('arena_admin'); setError(''); }}
              className={`pb-4 px-2 text-[10px] font-black tracking-widest uppercase transition-colors ${
                activeTab === 'arena_admin' ? 'text-primary border-b-2 border-primary' : 'text-white/40 hover:text-white/80'
              }`}
            >
              Arena Admin
            </button>
            <button
              onClick={() => { setActiveTab('security'); setError(''); }}
              className={`pb-4 px-2 text-[10px] font-black tracking-widest uppercase transition-colors ${
                activeTab === 'security' ? 'text-primary border-b-2 border-primary' : 'text-white/40 hover:text-white/80'
              }`}
            >
              Security
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="label-classic">Email Address</label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="label-classic">Password</label>
              <input
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-4 mt-2">
              {loading ? 'AUTHENTICATING...' : `LOGIN AS ${activeTab.replace('_', ' ').toUpperCase()}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
