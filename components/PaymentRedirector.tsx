'use client';

import { useEffect, useRef } from 'react';

type Props = {
  payuUrl: string;
  params: {
    key: string;
    hash: string;
    txnid: string;
    amount: string;
    firstname: string;
    email: string;
    phone: string;
    productinfo: string;
    surl: string;
    furl: string;
    enforce_paymethod?: string;
  };
};

export default function PaymentRedirector({ payuUrl, params }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    // PayU never calls surl/furl when the customer just hits the browser's
    // back button on its hosted page instead of using PayU's own cancel
    // option — so a fresh mount of this page is ambiguous between "first
    // visit, about to submit" and "customer came back from PayU without
    // paying". A sessionStorage flag (per txnid, survives back/forward
    // within the tab) disambiguates: seeing it already set means this is a
    // revisit, so fail the booking outright and send them to pick new slots
    // instead of silently re-submitting them straight back to the gateway.
    const storageKey = `fg_payu_submitted_${params.txnid}`;
    if (sessionStorage.getItem(storageKey)) {
      sessionStorage.removeItem(storageKey);
      fetch('/api/payment/failure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_ref: params.txnid, reason: 'customer_returned_from_gateway' }),
      })
        .then((res) => res.json().catch(() => null))
        .then((data) => {
          // The one case where the booking legitimately isn't failed: PayU
          // actually confirmed it (e.g. via another tab/device) in the gap
          // between the customer leaving and coming back here.
          if (data?.message === 'Booking already confirmed') {
            window.location.href = `/booking/success/${params.txnid}`;
          } else {
            window.location.href = `/booking/payment-failed/${params.txnid}`;
          }
        })
        .catch(() => {
          window.location.href = `/booking/payment-failed/${params.txnid}`;
        });
      return;
    }

    sessionStorage.setItem(storageKey, '1');
    formRef.current?.submit();
  }, [params.txnid]);

  return (
    <form ref={formRef} action={payuUrl} method="post" className="hidden">
      <input type="hidden" name="key" value={params.key} />
      <input type="hidden" name="hash" value={params.hash} />
      <input type="hidden" name="txnid" value={params.txnid} />
      <input type="hidden" name="amount" value={params.amount} />
      <input type="hidden" name="firstname" value={params.firstname} />
      <input type="hidden" name="email" value={params.email} />
      <input type="hidden" name="phone" value={params.phone} />
      <input type="hidden" name="productinfo" value={params.productinfo} />
      <input type="hidden" name="surl" value={params.surl} />
      <input type="hidden" name="furl" value={params.furl} />
      {params.enforce_paymethod && (
        <input type="hidden" name="enforce_paymethod" value={params.enforce_paymethod} />
      )}
    </form>
  );
}
