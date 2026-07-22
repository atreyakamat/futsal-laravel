import dotenv from 'dotenv';
dotenv.config();
import { getSmsProvider } from '../lib/sms.ts';
import { normalizePhoneNumber } from '../lib/phone.ts';

async function testWhatsapp() {
  const provider = getSmsProvider();
  console.log('Using SMS provider:', provider.constructor.name);

  // Bare 10-digit number (no country code), same as a real user typing their
  // number into the login UI. Run through normalizePhoneNumber() first, same
  // as app/api/auth/send-otp/route.ts does, so this exercises the real path.
  const rawInput = '9860814039';
  const to = normalizePhoneNumber(rawInput);
  const testOtp = '123456';
  const message = `Your OTP for AgnelArena is ${testOtp}. Valid for 10 minutes.`;

  console.log(`Sending message to ${to} (raw input: ${rawInput})...`);
  const success = await provider.sendSms(to, message);
  console.log('Result:', success ? 'SUCCESS' : 'FAILED');
}

testWhatsapp().catch(console.error);
