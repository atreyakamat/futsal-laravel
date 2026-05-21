import crypto from 'node:crypto';

export function getPayuConfig() {
  const merchantKey = process.env.PAYU_KEY ?? '';
  const merchantSalt = process.env.PAYU_SALT ?? '';
  const payuUrl = process.env.PAYU_TEST_MODE === 'false' ? 'https://secure.payu.in/_payment' : 'https://test.payu.in/_payment';

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