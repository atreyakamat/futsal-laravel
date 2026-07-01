import dotenv from 'dotenv';
dotenv.config();
import { getSmsProvider } from '../lib/sms.ts';

async function testWhatsapp() {
  const provider = getSmsProvider();
  console.log('Using SMS provider:', provider.constructor.name);

  // Send a test message with a 6-digit OTP
  const to = '917744020601';
  const testOtp = '123456';
  const message = `Your OTP for AgnelArena is ${testOtp}. Valid for 10 minutes.`;

  console.log(`Sending message to ${to}...`);
  const success = await provider.sendSms(to, message);
  console.log('Result:', success ? 'SUCCESS' : 'FAILED');
}

testWhatsapp().catch(console.error);
