import crypto from 'crypto';

export function getPayuConfig() {
  const isProd = process.env.PAYU_ENV === 'production' || process.env.PAYU_TEST_MODE === 'false';
  
  // Use user-defined credentials if present (regardless of env mode), otherwise fallback to sandbox defaults.
  const merchantKey = process.env.PAYU_MERCHANT_KEY || process.env.PAYU_KEY || process.env.PAYU_TEST_KEY || 'bPLpnO';
  const merchantSalt = process.env.PAYU_MERCHANT_SALT || process.env.PAYU_SALT || process.env.PAYU_TEST_SALT || 'IgE6ICwOJngI1nZwAnwkX6yK0pWJxOXE';

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

  // Hash formula: sha512(key|command|var1|SALT)
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