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
      <div className="glass p-10 rounded-[2.5rem] border border-white/10 shadow-2xl shadow-black/50">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mx-auto mb-6">
          <span className="material-symbols-outlined text-primary text-3xl">lock</span>
        </div>
        <h2 className="text-3xl font-black mb-2 text-center uppercase tracking-tighter italic">
          VERIFY <span className="text-primary">OTP</span>
        </h2>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center mb-8">
          Enter the 6-digit code
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1" htmlFor="otp">
              Enter 6-digit OTP
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 text-lg">
                password
              </span>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary transition-all placeholder:text-gray-800 tracking-[0.5em] font-black text-center text-2xl"
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
            disabled={loading || otp.length !== 6}
            className="w-full py-5 rounded-2xl font-black text-sm tracking-widest bg-primary text-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
        </form>

        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">
            Didn't receive code?{' '}
            <Link href="/login" className="text-primary hover:text-white transition-colors font-bold">
              Try Again
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}