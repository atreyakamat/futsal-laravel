'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSendOtp() {
    if (!identifier) return alert('Please enter your mobile number');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });

      if (response.ok) {
        setStep(2);
        alert('OTP sent via WhatsApp!');
      } else {
        alert('Failed to send OTP');
      }
    } catch (e) {
      alert('Error sending OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otp) return alert('Please enter OTP');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, otp }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        router.push(data.redirect || '/');
        router.refresh();
      } else {
        alert(data.message || 'Invalid OTP');
      }
    } catch (e) {
      alert('Error verifying OTP');
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
        <p className="label-classic text-center mb-10">
          Login with OTP
        </p>

        {step === 1 ? (
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="label-classic" htmlFor="identifier">
                Mobile Number
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors text-xl">
                  phone_android
                </span>
                <input
                  className="input-field pl-12"
                  id="identifier"
                  type="tel"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
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
