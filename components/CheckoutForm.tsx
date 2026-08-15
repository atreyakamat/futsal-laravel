'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface CheckoutFormProps {
  formAction: string;
  arenaId: number;
  date: string;
  slotsJson: string;
  csrfToken: string;
  paramName: string;
  effectiveMobile: string;
  paramEmail: string;
  checkoutTotal: number;
  payuReady: boolean;
  cutoffHours: number;
  refundFeeText: string;
  isWithinNoRefundWindow: boolean;
}

export default function CheckoutForm({
  formAction,
  arenaId,
  date,
  slotsJson,
  csrfToken,
  paramName,
  effectiveMobile,
  paramEmail,
  checkoutTotal,
  payuReady,
  cutoffHours,
  refundFeeText,
  isWithinNoRefundWindow,
}: CheckoutFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowPolicyModal(true);
  };

  const handleConfirm = () => {
    if (!agreed) return;
    formRef.current?.requestSubmit();
  };

  return (
    <>
      <form ref={formRef} action={formAction} method="POST" onSubmit={handleSubmit} className="space-y-6 sm:space-y-10">
        <input type="hidden" name="arena_id" value={arenaId} />
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="slots" value={slotsJson} />
        <input type="hidden" name="_csrf" value={csrfToken} />

        <div className="grid md:grid-cols-2 gap-6 sm:gap-10">
          <div className="space-y-3">
            <label htmlFor="customer_name" className="label-classic">Full Name</label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors text-xl">
                person
              </span>
              <input
                id="customer_name"
                type="text"
                name="customer_name"
                required
                defaultValue={paramName}
                placeholder="John Doe"
                className="input-field pl-12"
              />
            </div>
          </div>
          <div className="space-y-3">
            <label htmlFor="customer_mobile" className="label-classic">Mobile Number</label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors text-xl">
                phone_iphone
              </span>
              <input
                id="customer_mobile"
                type="tel"
                name="customer_mobile"
                required
                defaultValue={effectiveMobile}
                placeholder="+91 98765 43210"
                className="input-field pl-12"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label htmlFor="customer_email" className="label-classic">
            Email Address <span className="text-white/20 italic lowercase">(optional)</span>
          </label>
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors text-xl">
              mail
            </span>
            <input
              id="customer_email"
              type="email"
              name="customer_email"
              defaultValue={paramEmail}
              placeholder="john@example.com"
              className="input-field pl-12"
            />
          </div>
        </div>

        <div className="pt-6 sm:pt-10 space-y-6 sm:space-y-8">
          <button
            type="submit"
            id="checkout-confirm-btn"
            className="btn-primary w-full py-5 sm:py-6 text-sm flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
          >
            <span className="font-black italic text-base">{checkoutTotal === 0 ? 'CONFIRM BOOKING' : `CONFIRM & PAY ₹${checkoutTotal}`}</span>
            <span className="material-symbols-outlined font-black text-xl">arrow_forward</span>
          </button>

          {!payuReady && checkoutTotal > 0 && (
            <div className="p-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 text-yellow-300 text-[10px] font-black uppercase tracking-widest">
              PayU is not configured. Set PAYU_MERCHANT_KEY and PAYU_SALT to enable payments.
            </div>
          )}

          <p className="text-center text-[9px] text-white/20 uppercase tracking-[0.3em] font-black">
            End-to-End Encrypted Secure Checkout
          </p>
        </div>
      </form>

      {showPolicyModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 overflow-y-auto">
          <div className="glass-card !p-8 sm:!p-10 max-w-lg w-full space-y-6 my-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black uppercase tracking-tighter italic">
                Cancellation & <span className="text-primary">Refund Policy</span>
              </h2>
              <button onClick={() => setShowPolicyModal(false)} className="text-white/40 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3 text-sm text-white/70">
              <p>Cancel up to <strong className="text-white">{cutoffHours} hours</strong> before your scheduled session to be eligible for a refund.</p>
              <p>Eligible refunds are processed after deducting a <strong className="text-white">{refundFeeText}</strong>.</p>
            </div>

            {isWithinNoRefundWindow && checkoutTotal > 0 && (
              <div className="px-4 py-3 rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 text-xs font-black uppercase tracking-widest flex items-start gap-3">
                <span className="material-symbols-outlined text-lg shrink-0 animate-pulse">warning</span>
                This booking starts within {cutoffHours} hours. If you cancel or don't show up, you will NOT be eligible for any refund.
              </div>
            )}

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 accent-primary shrink-0"
              />
              <span className="text-sm font-bold text-white">
                I Agree to the Cancellation & Refund Policy{isWithinNoRefundWindow && checkoutTotal > 0 ? ', including the no-refund window above' : ''}.
              </span>
            </label>

            <div className="flex gap-4">
              <button onClick={() => setShowPolicyModal(false)} className="btn-secondary flex-1 !py-3">
                CANCEL
              </button>
              <button
                onClick={handleConfirm}
                disabled={!agreed}
                className="btn-primary flex-1 !py-3 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {checkoutTotal === 0 ? 'CONFIRM BOOKING' : `PROCEED TO PAY ₹${checkoutTotal}`}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
