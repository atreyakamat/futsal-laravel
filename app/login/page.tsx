'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Channel = 'mobile' | 'email';

function LoginPageInner() {
  const [channel, setChannel] = useState<Channel>('mobile');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only ever a same-site path (e.g. from checkout redirecting here) —
  // never followed if it isn't, so this can't be used as an open redirect.
  const next = searchParams.get('next');

  function fullIdentifier() {
    if (channel === 'mobile') return identifier ? `+91${identifier}` : '';
    return identifier.trim();
  }

  async function handleSendOtp() {
    setErrorMsg('');
    setSuccessMsg('');
    const value = fullIdentifier();
    if (!value) return setErrorMsg(channel === 'mobile' ? 'Please enter your mobile number' : 'Please enter your email address');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: value }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setStep(2);
        setSuccessMsg(channel === 'mobile' ? 'OTP sent via WhatsApp!' : 'OTP sent to your email!');
      } else {
        setErrorMsg(data.message || 'Failed to send OTP');
      }
    } catch (e) {
      setErrorMsg('Error sending OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setErrorMsg('');
    setSuccessMsg('');
    if (!otp) return setErrorMsg('Please enter OTP');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: fullIdentifier(), otp, next: next || undefined }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessMsg('Login successful!');
        router.push(data.redirect || '/');
        router.refresh();
      } else {
        setErrorMsg(data.message || 'Invalid OTP');
      }
    } catch (e) {
      setErrorMsg('Error verifying OTP');
    } finally {
      setLoading(false);
    }
  }

  function switchChannel(next: Channel) {
    setChannel(next);
    setIdentifier('');
    setStep(1);
    setErrorMsg('');
    setSuccessMsg('');
  }

  return (
    <div className="max-w-md mx-auto mt-20 px-6 py-20">
      <div className="glass-card">
        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 mx-auto mb-8 shadow-inner">
          <span className="material-symbols-outlined text-primary text-4xl">login</span>
        </div>
        <h2 className="text-4xl font-black mb-2 text-center uppercase tracking-tighter italic">
          WELCOME <span className="text-primary text-stroke">BACK</span>
        </h2>
        <p className="label-classic text-center mb-8">
          Login with OTP
        </p>

        {step === 1 && (
          <div className="flex justify-center gap-2 mb-8">
            <button
              type="button"
              onClick={() => switchChannel('mobile')}
              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${
                channel === 'mobile' ? 'bg-primary text-black' : 'bg-white/5 text-white/40 hover:text-white/70'
              }`}
            >
              Mobile
            </button>
            <button
              type="button"
              onClick={() => switchChannel('email')}
              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${
                channel === 'email' ? 'bg-primary text-black' : 'bg-white/5 text-white/40 hover:text-white/70'
              }`}
            >
              Email
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm font-medium text-center">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl mb-6 text-sm font-medium text-center">
            {successMsg}
          </div>
        )}

        {step === 1 ? (
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="label-classic" htmlFor="identifier">
                {channel === 'mobile' ? 'Mobile Number' : 'Email Address'}
              </label>
              {channel === 'mobile' ? (
                <div className="relative group flex border-2 border-white/10 rounded-xl overflow-hidden focus-within:border-primary transition-colors bg-white/5">
                  <div className="flex items-center justify-center px-4 border-r border-white/10 bg-black/20 font-black text-white/50">
                    +91
                  </div>
                  <input
                    className="w-full bg-transparent px-4 py-4 outline-none text-white font-medium"
                    id="identifier"
                    type="tel"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="77440 20601"
                  />
                </div>
              ) : (
                <input
                  className="input-field"
                  id="identifier"
                  type="email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="you@example.com"
                />
              )}
            </div>
            <button
              onClick={handleSendOtp}
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-3"
              type="button"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  SEND OTP
                  <span className="material-symbols-outlined text-lg font-black">send</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="label-classic" htmlFor="otp">
                Enter 6-digit OTP
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors text-xl">
                  password
                </span>
                <input
                  className="input-field pl-12 tracking-[0.5em] font-black text-xl"
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
              className="btn-primary w-full flex items-center justify-center gap-3"
              type="button"
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
            <button
              onClick={() => setStep(1)}
              className="w-full text-[10px] font-bold text-white/20 hover:text-primary uppercase tracking-[0.2em] transition-colors"
              type="button"
            >
              Back to identifier
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
