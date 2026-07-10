import { getSmsProvider } from './lib/sms.ts';

(async () => {
  const provider = getSmsProvider();
  await provider.sendSms('7744020601', '123456 is your verification code');
  await provider.sendSms('7744020601', 'CONFIRMED|2026-07-15|10:00-11:00|TKT-TEST1|REF123|Atreya');
})();
