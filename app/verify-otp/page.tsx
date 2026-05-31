'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function VerifyOtpPage({ searchParams }: Props) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Get identifier from searchParams (in client component we'd need to pass it differently)
  // For now, we'll handle it server-side

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!otp) return setError('Please enter OTP');

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: new URLSearchParams(window.location.search).get('identifier'), otp }),
      });

      if (response.ok) {
        router.push('/dashboard');
        router.refresh();
      } else {
        const data = await response.json();
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
        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 mx-auto mb-8">
          <span className="material-symbols-outlined text-primary text-4xl">lock</span>
        </div>
        <h2 className="text-4xl font-black mb-2 text-center uppercase tracking-tighter italic">
          VERIFY <span className="text-primary text-stroke">OTP</span>
        </h2>
        <p className="label-classic text-center mb-10">
          Enter the 6-digit code
        </p>

        {error && (
          <div className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-[0.2em] text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-3">
            <label className="label-classic" htmlFor="otp">
              Enter 6-digit OTP
            </label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors text-xl">
                password
              </span>
              <input
                className="input-field pl-12 tracking-[0.5em] font-black text-center text-3xl"
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="••••••"
                maxLength={6}
                inputMode="numeric"
                pattern="[0-9]{6}"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || otp?.length !== 6}
            className="btn-primary w-full flex items-center justify-center gap-3"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                VERIFY OTP
                <span className="material-symbols-outlined text-lg font-black">check_circle</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-white/5 text-center">
          <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold">
            Didn't receive code?{' '}
            <Link href="/login" className="text-primary hover:text-white transition-colors">
              Try Again
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}