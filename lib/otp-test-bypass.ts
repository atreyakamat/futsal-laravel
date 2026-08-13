/**
 * A single hardcoded test phone number + fixed OTP, requested for QA so
 * testers don't need a real WhatsApp send for every login/booking test.
 * Deliberately narrow (one specific number only) and independently toggled
 * off via TEST_OTP_BYPASS_ENABLED once real launch testing is done — set it
 * to 'false' in .env to disable without a code change/redeploy.
 */
const TEST_PHONE_NORMALIZED = '919111111111'; // 9111111111 after normalizePhoneNumber
const TEST_OTP = '4039';

export function isTestBypassEnabled(): boolean {
  return process.env.TEST_OTP_BYPASS_ENABLED !== 'false';
}

export function isTestPhoneNumber(normalizedIdentifier: string): boolean {
  return isTestBypassEnabled() && normalizedIdentifier === TEST_PHONE_NORMALIZED;
}

export function isTestOtp(otp: string): boolean {
  return otp === TEST_OTP;
}

export { TEST_OTP };
