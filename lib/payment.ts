import crypto from 'crypto';

/**
 * Allowed payment methods enforced via PayU API.
 * Per Basil Sir (12-Aug-2026): UPI only.
 *   ✅ UPI
 *   ❌ Debit card, Wallets, Net Banking, Credit card, EMI/BNPL — all excluded
 *
 * PayU code: UPI = UPI
 */
export const DEFAULT_ENFORCE_PAYMETHOD = 'UPI';

/**
 * Returns the enforce_paymethod string to pass to PayU's payment form.
 * Configurable via process.env.PAYU_ENFORCE_PAYMETHOD.
 */
export function getEnforcePaymethod(): string {
  return process.env.PAYU_ENFORCE_PAYMETHOD || DEFAULT_ENFORCE_PAYMETHOD;
}

export function getPayuConfig() {
  const isProd = process.env.PAYU_ENV === 'production' || process.env.PAYU_TEST_MODE === 'false';
  
  const merchantKey = process.env.PAYU_MERCHANT_KEY || process.env.PAYU_KEY || process.env.PAYU_TEST_KEY || '';
  const merchantSalt = process.env.PAYU_MERCHANT_SALT || process.env.PAYU_SALT || process.env.PAYU_TEST_SALT || '';

  const payuBaseUrl = process.env.PAYU_BASE_URL || (isProd ? 'https://secure.payu.in' : 'https://test.payu.in');
  const payuUrl = `${payuBaseUrl}/_payment`;

  return { merchantKey, merchantSalt, payuUrl };
}

export function generatePayuHash(params: {
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone?: string;
}) {
  const sanitize = (str: string) => str.replace(/\|/g, '');
  const { merchantKey, merchantSalt } = getPayuConfig();

  const hashSequence = [
    merchantKey,
    params.txnid,
    params.amount,
    sanitize(params.productinfo),
    sanitize(params.firstname),
    sanitize(params.email),
    '', // udf1
    '', // udf2
    '', // udf3
    '', // udf4
    '', // udf5
    '', // udf6
    '', // udf7
    '', // udf8
    '', // udf9
    '', // udf10
    merchantSalt
  ];
  const hashString = hashSequence.join('|');
  return crypto.createHash('sha512').update(hashString).digest('hex').toLowerCase();
}

export function verifyPayuResponseHash(params: {
  status: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  hash?: string | null;
  additionalCharges?: string | null;
}) {
  const { merchantKey, merchantSalt } = getPayuConfig();
  if (!params.hash) return false;

  const expectedSequence = [
    merchantSalt,
    params.status,
    '', // udf10
    '', // udf9
    '', // udf8
    '', // udf7
    '', // udf6
    '', // udf5
    '', // udf4
    '', // udf3
    '', // udf2
    '', // udf1
    params.email,
    params.firstname,
    params.productinfo,
    params.amount,
    params.txnid,
    merchantKey
  ];
  
  let hashString = expectedSequence.join('|');
  if (params.additionalCharges) {
    hashString = `${params.additionalCharges}|${hashString}`;
  }
  const expectedHash = crypto.createHash('sha512').update(hashString).digest('hex').toLowerCase();
  return expectedHash === params.hash.toLowerCase();
}

export async function verifyPaymentWithPayu(txnid: string) {
  const { merchantKey, merchantSalt } = getPayuConfig();
  const command = 'verify_payment';

  const hashString = `${merchantKey}|${command}|${txnid}|${merchantSalt}`;
  const hash = crypto.createHash('sha512').update(hashString).digest('hex').toLowerCase();

  const formData = new URLSearchParams();
  formData.append('key', merchantKey);
  formData.append('hash', hash);
  formData.append('var1', txnid);
  formData.append('command', command);

  try {
    const res = await fetch('https://info.payu.in/merchant/postservice.php?form=2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await res.json();
    if (data.status === 1 && data.transaction_details && data.transaction_details[txnid]) {
      return data.transaction_details[txnid];
    }
    return null;
  } catch (err) {
    console.error('PayU API verification error:', err);
    return null;
  }
}

export interface PayuRefundResult {
  success: boolean;
  refundRequestId?: string;
  payuTxnId?: string;
  response?: any;
  message: string;
  environmentLimitation?: boolean;
}

export async function initiatePayuRefund(params: {
  bookingRef: string;
  mihpayid?: string | null;
  amount: number;
  reason?: string;
}): Promise<PayuRefundResult> {
  // var1 must be PayU's own transaction id (mihpayid) — falling back to our
  // bookingRef here used to send PayU a value it can never recognize,
  // guaranteeing a "Transaction Not Found" (error 116) response. Fail fast
  // locally instead of making a request that can only ever be rejected.
  if (!params.mihpayid) {
    return {
      success: false,
      message: 'No PayU transaction id (mihpayid) on this booking — cannot request a refund without it.',
      environmentLimitation: false,
    };
  }

  const { merchantKey, merchantSalt } = getPayuConfig();
  const isProd = process.env.PAYU_ENV === 'production' || process.env.PAYU_TEST_MODE === 'false';
  const postserviceUrl = isProd
    ? 'https://info.payu.in/merchant/postservice.php?form=2'
    : 'https://test.payu.in/merchant/postservice.php?form=2';

  const command = 'cancel_refund_transaction';
  const var1 = params.mihpayid;
  // PayU caps this merchant-generated token at 23 chars and requires it be
  // unique per refund request. bookingRef already carries an 8-char unique
  // suffix ("REF-XXXXXXXX") — reuse just that instead of the full ref, plus
  // a base36 timestamp so retrying a refund on the same booking still gets
  // a fresh token. ("RFD" + 8 + "-" + up to 9 base36 digits = well under 23.)
  const tokenId = `RFD${params.bookingRef.replace(/^REF-/, '')}-${Date.now().toString(36)}`;
  const amountStr = params.amount.toFixed(2);

  const hashString = `${merchantKey}|${command}|${var1}|${merchantSalt}`;
  const hash = crypto.createHash('sha512').update(hashString).digest('hex').toLowerCase();

  const formData = new URLSearchParams();
  formData.append('key', merchantKey);
  formData.append('command', command);
  formData.append('hash', hash);
  formData.append('var1', var1);
  formData.append('var2', tokenId);
  formData.append('var3', amountStr);

  try {
    const res = await fetch(postserviceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const data = await res.json();
    // PayU documents error_code 102 ("Refund Queued") as a success case
    // regardless of what `status` says — a queued refund is still a
    // successfully-accepted one, just not yet sent to the bank.
    const errorCode = Number(data.error_code);
    const isQueued = errorCode === 102;

    if (isQueued || data.status === 1 || data.status === '1' || data.msg?.toLowerCase().includes('success') || data.msg?.toLowerCase().includes('initiated') || data.msg?.toLowerCase().includes('queued')) {
      return {
        success: true,
        refundRequestId: tokenId,
        payuTxnId: var1,
        response: data,
        message: data.msg || 'Refund initiated successfully via PayU.',
      };
    }

    // Check if error is due to test environment sandbox limitation
    const isEnvLimitation = !isProd || String(data.msg || '').toLowerCase().includes('invalid transaction') || String(data.msg || '').toLowerCase().includes('not found');

    return {
      success: false,
      refundRequestId: tokenId,
      payuTxnId: var1,
      response: data,
      message: data.msg || 'PayU refund request failed',
      environmentLimitation: isEnvLimitation,
    };
  } catch (err: any) {
    console.error('PayU refund API error:', err);
    return {
      success: false,
      refundRequestId: tokenId,
      payuTxnId: var1,
      response: { error: err.message },
      message: `Network error calling PayU refund API: ${err.message}`,
      environmentLimitation: true,
    };
  }
}

export async function checkPayuRefundStatus(refundRequestId: string): Promise<{
  success: boolean;
  status: string;
  response: any;
}> {
  const { merchantKey, merchantSalt } = getPayuConfig();
  const isProd = process.env.PAYU_ENV === 'production' || process.env.PAYU_TEST_MODE === 'false';
  const postserviceUrl = isProd 
    ? 'https://info.payu.in/merchant/postservice.php?form=2'
    : 'https://test.payu.in/merchant/postservice.php?form=2';

  const command = 'check_action_status';
  const hashString = `${merchantKey}|${command}|${refundRequestId}|${merchantSalt}`;
  const hash = crypto.createHash('sha512').update(hashString).digest('hex').toLowerCase();

  const formData = new URLSearchParams();
  formData.append('key', merchantKey);
  formData.append('command', command);
  formData.append('hash', hash);
  formData.append('var1', refundRequestId);

  // PayU's documented refund-state values for check_action_status.
  const KNOWN_STATES = ['QUEUED', 'SUCCESS', 'FAILURE', 'IN PROGRESS', 'REQUESTED', 'OD_HIT'];

  try {
    const res = await fetch(postserviceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });
    const data = await res.json();

    // The docs are inconsistent about which field carries the actual refund
    // state (QUEUED/SUCCESS/FAILURE/IN PROGRESS/REQUESTED/od_hit) versus the
    // generic 1/0 "did the API call succeed" flag — both have shown up under
    // the same field name in different examples. Check every plausible field
    // for a recognized state token first; only fall back to the numeric
    // status guess if none of them match.
    const candidates = [data.status, data.action_status, data.status_msg, data.refund_status];
    const matchedState = candidates
      .map((c) => String(c ?? '').toUpperCase().trim())
      .find((c) => KNOWN_STATES.includes(c));

    const status = matchedState || (data.status === 1 || data.status === '1' ? 'SUCCESS' : 'PENDING');
    const success = matchedState ? matchedState === 'SUCCESS' : (data.status === 1 || data.status === '1');

    return { success, status, response: data };
  } catch (err: any) {
    return {
      success: false,
      status: 'UNKNOWN',
      response: { error: err.message },
    };
  }
}