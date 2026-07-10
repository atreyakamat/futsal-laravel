import { getSmsProvider } from './lib/sms';

async function run() {
  const provider = getSmsProvider();
  const res = await provider.sendSms(
    '7744020601',
    'CONFIRMED|2026-07-20|10:00-11:00|TKT-260720-ABCD|REF-1234|Atreya Kamat'
  );
  console.log('Result:', res);
}
run();
