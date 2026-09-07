/**
 * Regression guard for lib/domain.ts's updateCustomerProfile — extracted
 * from app/api/dashboard/profile/route.ts's PUT handler (see openspec change
 * fix-checkout-customer-details) so app/api/bookings/process/route.ts can
 * reuse the same OTP-verified-field lock and email-uniqueness checks when
 * persisting a correction submitted at checkout. Covers the booking-and-payment
 * spec's "An OTP-verified contact field cannot be edited" requirement at this
 * shared call site, since it previously had no direct test coverage.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { query, queryOne, updateCustomerProfile } from '@/lib/domain';

describe('updateCustomerProfile', () => {
  const nonce = Date.now().toString(36);
  let userA: { id: number; email: string; customer_mobile: string };
  let userB: { id: number; email: string };

  beforeAll(async () => {
    const emailA = `otp-lock-a-${nonce}@example.com`;
    const emailB = `otp-lock-b-${nonce}@example.com`;
    const mobileA = `9${nonce.padStart(9, '0')}`.slice(0, 10);

    await query(
      `INSERT INTO users (name, email, customer_mobile, role, created_at, updated_at)
       VALUES ('', ?, ?, 'player', NOW(), NOW())`,
      [emailA, mobileA]
    );
    await query(
      `INSERT INTO users (name, email, customer_mobile, role, created_at, updated_at)
       VALUES ('Other Customer', ?, NULL, 'player', NOW(), NOW())`,
      [emailB]
    );

    const rowA = await queryOne<{ id: number }>('SELECT id FROM users WHERE email = ?', [emailA]);
    const rowB = await queryOne<{ id: number }>('SELECT id FROM users WHERE email = ?', [emailB]);
    userA = { id: rowA!.id, email: emailA, customer_mobile: mobileA };
    userB = { id: rowB!.id, email: emailB };
  });

  it('rejects changing the email when it was verified via OTP at login', async () => {
    const attemptedEmail = `otp-lock-a-changed-${nonce}@example.com`;
    const result = await updateCustomerProfile(
      userA.id,
      { name: 'Basil', email: attemptedEmail, customer_mobile: userA.customer_mobile },
      'email'
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.message).toContain('verified via OTP login');
    }

    const dbUser = await queryOne<{ email: string }>('SELECT email FROM users WHERE id = ?', [userA.id]);
    expect(dbUser?.email).toBe(userA.email);
  });

  it('rejects changing the mobile number when it was verified via OTP at login', async () => {
    const result = await updateCustomerProfile(
      userA.id,
      { name: 'Basil', email: userA.email, customer_mobile: '9999999999' },
      'mobile'
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.message).toContain('verified via OTP login');
    }

    const dbUser = await queryOne<{ customer_mobile: string }>('SELECT customer_mobile FROM users WHERE id = ?', [userA.id]);
    expect(dbUser?.customer_mobile).toBe(userA.customer_mobile);
  });

  it('allows editing the mobile number when email (not mobile) was the OTP-verified channel', async () => {
    const result = await updateCustomerProfile(
      userA.id,
      { name: 'Basil Jose', email: userA.email, customer_mobile: '9111111111' },
      'email'
    );

    expect(result.ok).toBe(true);
    const dbUser = await queryOne<{ name: string; customer_mobile: string }>('SELECT name, customer_mobile FROM users WHERE id = ?', [userA.id]);
    expect(dbUser?.name).toBe('Basil Jose');
    expect(dbUser?.customer_mobile).toBe('9111111111');

    // restore for subsequent tests
    await query('UPDATE users SET customer_mobile = ? WHERE id = ?', [userA.customer_mobile, userA.id]);
  });

  it('rejects an email that already belongs to another account', async () => {
    const result = await updateCustomerProfile(
      userA.id,
      { name: 'Basil', email: userB.email, customer_mobile: userA.customer_mobile },
      null
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.message).toContain('already in use');
    }
  });

  it('allows a correction to the name alone when no field is OTP-locked', async () => {
    const result = await updateCustomerProfile(
      userA.id,
      { name: 'Corrected Name', email: userA.email, customer_mobile: userA.customer_mobile },
      null
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe('Corrected Name');
    }

    const dbUser = await queryOne<{ name: string }>('SELECT name FROM users WHERE id = ?', [userA.id]);
    expect(dbUser?.name).toBe('Corrected Name');
  });
});
