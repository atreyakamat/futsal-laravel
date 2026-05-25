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
    if (!identifier) return alert('Please enter email or mobile');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });

      if (response.ok) {
        setStep(2);
        alert('OTP sent! (Check logs for testing)');
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
      <div className="glass p-10 rounded-[2.5rem] border border-white/10 shadow-2xl shadow-black/50">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mx-auto mb-6">
          <span className="material-symbols-outlined text-primary text-3xl">login</span>
        </div>
        <h2 className="text-3xl font-black mb-2 text-center uppercase tracking-tighter italic">
          WELCOME <span className="text-primary">BACK</span>
        </h2>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center mb-8">
          Login with OTP
        </p>

        {step === 1 ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1" htmlFor="identifier">
                Email or Mobile Number
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 text-lg">
                  person
                </span>
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary transition-all placeholder:text-gray-800"
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
              className="w-full py-5 rounded-2xl font-black text-sm tracking-widest bg-primary text-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
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
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1" htmlFor="otp">
                Enter 6-digit OTP
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 text-lg">
                  password
                </span>
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary transition-all placeholder:text-gray-800 tracking-[0.5em] font-black"
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
              className="w-full py-5 rounded-2xl font-black text-sm tracking-widest bg-primary text-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
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
              onClick={() => setStep(1)}
              className="w-full text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:text-white transition-colors"
              type="button"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
