'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const router = useRouter();

  async function handleSendOtp() {
    setErrorMsg('');
    setSuccessMsg('');
    if (!identifier) return setErrorMsg('Please enter your mobile number');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setStep(2);
        setSuccessMsg('OTP sent via WhatsApp!');
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
        body: JSON.stringify({ identifier, otp }),
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
                Mobile Number
              </label>
              <div className="relative group flex border-2 border-white/10 rounded-xl overflow-hidden focus-within:border-primary transition-colors bg-white/5">
                <div className="flex items-center justify-center px-4 border-r border-white/10 bg-black/20 font-black text-white/50">
                  +91
                </div>
                <input
                  className="w-full bg-transparent px-4 py-4 outline-none text-white font-medium"
                  id="identifier"
                  type="tel"
                  value={identifier.replace('+91', '').trim()}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="77440 20601"
                />
              </div>
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
