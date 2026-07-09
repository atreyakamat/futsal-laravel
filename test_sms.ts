import { AiSensyProvider } from './lib/sms';

async function testOtp() {
  const provider = new AiSensyProvider();
  console.log('Sending OTP...');
  await provider.sendSms('7744020601', 'Your OTP for AgnelArena is 123456. Valid for 10 minutes.');
  console.log('Done.');
}

async function testConfirmation() {
  const provider = new AiSensyProvider();
  console.log('Sending Confirmation...');
  // Format: CONFIRMED|Date|Time|Ticket|BookingRef|Name
  await provider.sendSms('7744020601', 'CONFIRMED|2026-07-15|17:00 - 18:00|TKT-ABC123|REF99999|John Doe');
  console.log('Done.');
}

async function main() {
  await testOtp();
  await testConfirmation();
}

main().catch(console.error);
