import { describe, it, expect, beforeEach } from 'vitest';
import { signValue, unsignValue } from '@/lib/session';
import { isLockedOut, recordFailedAttempt, resetAttempts, canSendOtp } from '@/lib/rate-limit';
import { query } from '@/lib/db';

describe('Auth & Session Cookie Security', () => {
  it('should cryptographically sign and verify values correctly', async () => {
    const original = '12345';
    const signed = await signValue(original);
    
    // Structure check
    expect(signed).toContain('.');
    
    // Valid signature check
    const unsigned = await unsignValue(signed);
    expect(unsigned).toBe(original);

    // Tampered signature check
    const tampered = signed + 'x';
    const tamperedUnsigned = await unsignValue(tampered);
    expect(tamperedUnsigned).toBeNull();

    // Random non-signed cookie check
    expect(await unsignValue('12345')).toBeNull();
  });
});

describe('OTP Rate Limiting & Lockouts', () => {
  const testIdentifier = 'test_player@example.com';

  beforeEach(async () => {
    await resetAttempts(testIdentifier);
    await query('DELETE FROM user_otps WHERE identifier = ?', [testIdentifier]);
  });

  it('should track failed attempts and trigger lockout at 5 failures', async () => {
    // Starts with 0 failures
    expect(await isLockedOut(testIdentifier)).toBe(false);

    // Record failures
    let attempts = 0;
    for (let i = 0; i < 4; i++) {
      attempts = await recordFailedAttempt(testIdentifier);
      expect(attempts).toBe(i + 1);
      expect(await isLockedOut(testIdentifier)).toBe(false);
    }

    // 5th attempt triggers lockout
    attempts = await recordFailedAttempt(testIdentifier);
    expect(attempts).toBe(5);
    expect(await isLockedOut(testIdentifier)).toBe(true);
  });

  it('should reset attempts counter on resetAttempts call', async () => {
    await recordFailedAttempt(testIdentifier);
    await recordFailedAttempt(testIdentifier);
    
    await resetAttempts(testIdentifier);
    expect(await isLockedOut(testIdentifier)).toBe(false);

    const attempts = await recordFailedAttempt(testIdentifier);
    expect(attempts).toBe(1); // restarts from 1
  });

  it('should enforce send cooling down period and lockout check', async () => {
    // Should initially be allowed
    expect(await canSendOtp(testIdentifier)).toBe(true);

    // Record 5 failures to trigger lockout
    for (let i = 0; i < 5; i++) {
      await recordFailedAttempt(testIdentifier);
    }
    
    // Now should be denied sending OTP because of lockout
    expect(await canSendOtp(testIdentifier)).toBe(false);
  });
});
