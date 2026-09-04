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
  cancellationCode: string;
  paymentMode: 'online' | 'offline';
  refundsEnabled: boolean;
  refundDeadlineText: string;
  // Which field was actually verified at login (mobile or email OTP) — that
  // field is locked read-only here since it's a proven identity, not just
  // typed text. null for a session predating this, or channel unknown.
  lockedField?: 'mobile' | 'email' | null;
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
  cancellationCode,
  paymentMode,
  refundsEnabled,
  refundDeadlineText,
  lockedField,
}: CheckoutFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [hasGstin, setHasGstin] = useState(false);
  const [wantsCompanyName, setWantsCompanyName] = useState(false);

  // The visible button is a plain trigger (type="button"), not a submit
  // button — the form has no onSubmit interception, so the ONLY way it
  // actually posts is via requestSubmit() below, after the modal is
  // confirmed. (An earlier version made the button type="submit" and
  // intercepted onSubmit to open the modal, then called requestSubmit()
  // from the confirm button — but that just re-fired the same
  // interceptor, which called preventDefault() again and reopened the
  // already-open modal, so "Proceed to Pay" never actually submitted.)
  const openPolicyModal = () => {
    if (formRef.current && !formRef.current.reportValidity()) {
      return; // native validation UI (e.g. missing required fields) takes over
    }
    setShowPolicyModal(true);
  };

  const handleConfirm = () => {
    if (!agreed) return;
    formRef.current?.requestSubmit();
  };

  return (
    <>
      <form ref={formRef} action={formAction} method="POST" className="space-y-6 sm:space-y-10">
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
            <label htmlFor="customer_mobile" className="label-classic">
              Mobile Number {lockedField === 'mobile' && <span className="text-primary normal-case">(verified)</span>}
            </label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors text-xl">
                {lockedField === 'mobile' ? 'lock' : 'phone_iphone'}
              </span>
              <input
                id="customer_mobile"
                type="tel"
                name="customer_mobile"
                required
                readOnly={lockedField === 'mobile'}
                defaultValue={effectiveMobile}
                placeholder="+91 98765 43210"
                className={`input-field pl-12 ${lockedField === 'mobile' ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label htmlFor="customer_email" className="label-classic">
            Email Address {lockedField === 'email' && <span className="text-primary normal-case">(verified)</span>}
          </label>
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors text-xl">
              {lockedField === 'email' ? 'lock' : 'mail'}
            </span>
            <input
              id="customer_email"
              type="email"
              name="customer_email"
              required
              readOnly={lockedField === 'email'}
              defaultValue={paramEmail}
              placeholder="john@example.com"
              className={`input-field pl-12 ${lockedField === 'email' ? 'opacity-60 cursor-not-allowed' : ''}`}
            />
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <label className="flex items-center gap-3 text-xs font-black uppercase tracking-widest cursor-pointer">
            <input
              type="checkbox"
              checked={hasGstin}
              onChange={(e) => setHasGstin(e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            Do you have a GST number?
          </label>
          {hasGstin && (
            <input
              type="text"
              name="customer_gstin"
              required
              placeholder="GSTIN"
              className="input-field"
            />
          )}

          <label className="flex items-center gap-3 text-xs font-black uppercase tracking-widest cursor-pointer">
            <input
              type="checkbox"
              checked={wantsCompanyName}
              onChange={(e) => setWantsCompanyName(e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            Should the invoice show a company name?
          </label>
          {wantsCompanyName && (
            <input
              type="text"
              name="customer_company_name"
              required
              placeholder="Company Name"
              className="input-field"
            />
          )}
        </div>

        <div className="pt-6 sm:pt-10 space-y-6 sm:space-y-8">
          <button
            type="button"
            id="checkout-confirm-btn"
            onClick={openPolicyModal}
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
            {(() => {
              const noRefundWindow = refundsEnabled && paymentMode === 'online' && isWithinNoRefundWindow && checkoutTotal > 0;
              return (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black uppercase tracking-tighter italic">
                      {!refundsEnabled ? (
                        <>No <span className="text-primary">Refunds</span></>
                      ) : paymentMode === 'online' ? (
                        noRefundWindow ? (
                          <>No <span className="text-primary">Refund</span> On Cancellation</>
                        ) : (
                          <>Cancellation & <span className="text-primary">Refund Policy</span></>
                        )
                      ) : (
                        <>Cancellation <span className="text-primary">Policy</span></>
                      )}
                    </h2>
                    <button onClick={() => setShowPolicyModal(false)} className="text-white/40 hover:text-white transition-colors">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  {!refundsEnabled ? (
                    <div className="space-y-3 text-sm text-white/70">
                      <p>Cancellations are <strong className="text-white">not refunded</strong> under any circumstances at this arena.</p>
                      <p>Cancellation itself remains open right up to your session — it simply won&apos;t carry a refund.</p>
                    </div>
                  ) : paymentMode === 'online' ? (
                    noRefundWindow ? (
                      <div className="px-4 py-3 rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 text-xs font-black uppercase tracking-widest flex items-start gap-3">
                        <span className="material-symbols-outlined text-lg shrink-0 animate-pulse">warning</span>
                        {cancellationCode === 'NO_REFUND_MONTH_EXPIRED'
                          ? "This booking's refund window has already closed. If you cancel, you will NOT be eligible for any refund."
                          : `This booking starts within ${cutoffHours} hours. If you cancel or don't show up, you will NOT be eligible for any refund.`}
                      </div>
                    ) : (
                      <div className="space-y-3 text-sm text-white/70">
                        <p>This booking can be cancelled with a refund before <strong className="text-white">{refundDeadlineText}</strong>.</p>
                        <p>Eligible refunds are processed after deducting a <strong className="text-white">{refundFeeText}</strong>.</p>
                        <p>After that deadline — or once your session begins — cancellation is still possible, just without a refund.</p>
                      </div>
                    )
                  ) : (
                    <div className="space-y-3 text-sm text-white/70">
                      <p>This is a <strong className="text-white">pay-at-venue</strong> booking — payment is not collected online.</p>
                      <p>You can cancel this booking from your dashboard. Since no online payment is taken, <strong className="text-white">no refund applies</strong>.</p>
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
                      {!refundsEnabled
                        ? 'I Agree that no refunds are issued for cancellations at this arena.'
                        : paymentMode === 'online'
                          ? noRefundWindow
                            ? 'I Agree that this booking is not eligible for a refund if cancelled.'
                            : `I Agree that this booking is refund-eligible only if cancelled before ${refundDeadlineText}.`
                          : 'I Agree to the Cancellation Policy.'}
                    </span>
                  </label>
                </>
              );
            })()}

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
