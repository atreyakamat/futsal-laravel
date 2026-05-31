'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDemo, setShowDemo] = useState(false);
  const router = useRouter();

  async function handleSendOtp() {
    if (!identifier) return setError('Please enter email or mobile');
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/admin/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });

      if (response.ok) {
        setStep(2);
        setError('');
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to send OTP');
      }
    } catch (e) {
      setError('Error sending OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otp) return setError('Please enter OTP');
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/admin/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, otp }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.role === 'super_admin') {
          router.push('/admin/super-admin');
        } else {
          router.push('/admin/dashboard');
        }
        router.refresh();
      } else {
        setError(data.message || 'Invalid OTP');
      }
    } catch (e) {
      setError('Error verifying OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20 px-6 py-20">
      <div className="glass-card">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mx-auto mb-6">
          <span className="material-symbols-outlined text-primary text-3xl">admin_panel_settings</span>
        </div>
        <h2 className="text-3xl font-black mb-2 text-center uppercase tracking-tighter italic">
          ADMIN <span className="text-primary">PANEL</span>
        </h2>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center mb-8">
          Login with OTP
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest">
            {error}
          </div>
        )}

        {showDemo && (
          <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-200 text-xs font-bold">
            <p className="mb-2">📋 Default Demo Credentials:</p>
            <p className="mb-1">Email: <span className="text-primary">admin@example.com</span></p>
            <p className="mb-3">Password: <span className="text-primary">Admin@123456</span></p>
            <p className="text-xs text-gray-400">Change these via environment variables before deploying to production.</p>
          </div>
        )}

        {step === 1 ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="label-classic" htmlFor="identifier">
                Email or Mobile Number
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 text-lg">
                  person
                </span>
                <input
                  className="input-field pl-12"
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter Email or Mobile"
                />
              </div>
            </div>
            <button
              onClick={handleSendOtp}
              disabled={loading}
              className="btn-primary w-full"
              type="button"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  SEND OTP
                  <span className="material-symbols-outlined text-sm font-black">send</span>
                </>
              )}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-gradient-to-b from-gray-900 to-gray-950 text-gray-500 uppercase font-bold">
                  OR
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowDemo(!showDemo)}
              className="w-full px-4 py-3 rounded-xl border border-primary/30 text-primary hover:bg-primary/5 transition-colors font-bold text-xs uppercase tracking-widest"
              type="button"
            >
              {showDemo ? '✓ Hide' : '📝 View'} Demo Credentials
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="label-classic" htmlFor="otp">
                Enter 6-digit OTP
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 text-lg">
                  password
                </span>
                <input
                  className="input-field pl-12 tracking-[0.5em] font-black"
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="••••••"
                  maxLength={6}
                />
              </div>
            </div>
            <button
              onClick={handleVerifyOtp}
              disabled={loading}
              className="btn-primary w-full"
              type="button"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  VERIFY OTP
                  <span className="material-symbols-outlined text-sm font-black">check_circle</span>
                </>
              )}
            </button>
            <button
              onClick={() => { setStep(1); setError(''); }}
              className="w-full text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:text-white transition-colors py-3"
              type="button"
            >
              Back
            </button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">
            Not an admin?{' '}
            <Link href="/login" className="text-primary hover:text-white transition-colors font-bold">
              User Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
