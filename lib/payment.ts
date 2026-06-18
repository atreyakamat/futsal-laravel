import crypto from 'crypto';

export function getPayuConfig() {
  const merchantKey = process.env.PAYU_MERCHANT_KEY ?? process.env.PAYU_KEY ?? '';
  const merchantSalt = process.env.PAYU_MERCHANT_SALT ?? process.env.PAYU_SALT ?? '';
  const payuBaseUrl = process.env.PAYU_BASE_URL ?? (
    (process.env.PAYU_ENV === 'production' || process.env.PAYU_TEST_MODE === 'false')
      ? 'https://secure.payu.in'
      : 'https://test.payu.in'
  );
  const payuUrl = `${payuBaseUrl.replace(/\/$/, '')}/_payment`;

  return { merchantKey, merchantSalt, payuUrl };
}

export function generatePayuHash(params: {
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
}) {
  const { merchantKey, merchantSalt } = getPayuConfig();

  const hashString = `${merchantKey}|${params.txnid}|${params.amount}|${params.productinfo}|${params.firstname}|${params.email}|||||||||||${merchantSalt}`;
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
}) {
  const { merchantKey, merchantSalt } = getPayuConfig();
  if (!params.hash) return false;

  const hashString = `${merchantSalt}|${params.status}|||||||||||${params.email}|${params.firstname}|${params.productinfo}|${params.amount}|${params.txnid}|${merchantKey}`;
  const expectedHash = crypto.createHash('sha512').update(hashString).digest('hex').toLowerCase();
  return expectedHash === params.hash.toLowerCase();
}