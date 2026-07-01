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
  };
};

export default function PaymentRedirector({ payuUrl, params }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (formRef.current && !submittedRef.current) {
      submittedRef.current = true;
      formRef.current.submit();
    }
  }, []);

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
    </form>
  );
}
