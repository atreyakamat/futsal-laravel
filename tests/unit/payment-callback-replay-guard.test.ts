/**
 * Regression guard for the payment-callback replay/resurrection fix: a
 * cancelled booking must never be flipped back to 'confirmed' by a
 * replayed, duplicated, or delayed PayU success callback. Covers both the
 * lib/domain.ts confirmPayment() guard directly and the full
 * app/api/payment/callback/route.ts POST handler with a validly-hash-signed
 * payload (computed the same way lib/payment.ts's verifyPayuResponseHash
 * does, using whatever PAYU_MERCHANT_KEY/SALT this environment has — empty
 * string in dev is fine since the test computes the hash the same way).
 * See openspec change fix-payment-replay-and-slot-lock-abuse.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'crypto';
import { query, queryOne, confirmPayment } from '@/lib/domain';
import { getPayuConfig } from '@/lib/payment';
import { POST } from '@/app/api/payment/callback/route';

function computeCallbackHash(params: {
  status: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
}) {
  const { merchantKey, merchantSalt } = getPayuConfig();
  const sequence = [
    merchantSalt,
    params.status,
    '', '', '', '', '', '', '', '', '', '',
    params.email,
    params.firstname,
    params.productinfo,
    params.amount,
    params.txnid,
    merchantKey,
  ];
  return crypto.createHash('sha512').update(sequence.join('|')).digest('hex').toLowerCase();
}

let testUserId: number;

async function insertBooking(bookingRef: string, paymentStatus: string, nonce: string) {
  const ticketNumber = `TKT-REPLAY-${nonce}`;
  // time_slot is unique per call (not a real "HH:MM-HH:MM" value) so the
  // bookings_active_slot_idx partial unique index (arena_id, booking_date,
  // time_slot) never collides across test runs — nothing this test
  // exercises (confirmPayment / the callback route) parses time_slot.
  await query(
    `INSERT INTO bookings (arena_id, user_id, booking_ref, ticket_number, customer_name, customer_mobile, customer_email, booking_date, time_slot, payment_status, payment_method, amount, created_at, updated_at)
     VALUES (1, ?, ?, ?, 'Replay Guard Test', '9111111111', 'replay-guard@example.com', '2026-12-25', ?, ?, 'online', 1000, NOW(), NOW())`,
    [testUserId, bookingRef, ticketNumber, `slot-${nonce}`, paymentStatus]
  );
}

beforeAll(async () => {
  let user = await queryOne<{ id: number }>('SELECT id FROM users LIMIT 1');
  if (!user) {
    await query(
      `INSERT INTO users (name, email, customer_mobile, role, created_at, updated_at)
       VALUES ('Replay Guard Test User', 'replay-guard-user@example.com', '9111111111', 'player', NOW(), NOW())`
    );
    user = await queryOne<{ id: number }>('SELECT id FROM users ORDER BY id DESC LIMIT 1');
  }
  testUserId = user!.id;
});

describe('confirmPayment() — cancelled bookings cannot be re-confirmed', () => {
  it('does nothing (returns null) when the booking is already cancelled', async () => {
    const nonce = Date.now().toString(36) + '-a';
    const ref = `REF-RPLA${nonce}`.slice(0, 16).toUpperCase();
    await insertBooking(ref, 'cancelled', nonce);

    const result = await confirmPayment(ref, 'MIHPAYID_REPLAY_TEST');

    expect(result).toBeNull();
    const row = await queryOne<{ payment_status: string }>('SELECT payment_status FROM bookings WHERE booking_ref = ?', [ref]);
    expect(row?.payment_status).toBe('cancelled');
  });

  it('confirms normally when the booking is still pending', async () => {
    const nonce = Date.now().toString(36) + '-b';
    const ref = `REF-RPLB${nonce}`.slice(0, 16).toUpperCase();
    await insertBooking(ref, 'pending', nonce);

    const result = await confirmPayment(ref, 'MIHPAYID_REPLAY_TEST');

    expect(result).not.toBeNull();
    const row = await queryOne<{ payment_status: string }>('SELECT payment_status FROM bookings WHERE booking_ref = ?', [ref]);
    expect(row?.payment_status).toBe('confirmed');
  });
});

describe('POST /api/payment/callback — replay against a cancelled booking', () => {
  it('leaves a cancelled booking cancelled when a valid success callback is replayed', async () => {
    const nonce = Date.now().toString(36) + '-c';
    const ref = `REF-RPLC${nonce}`.slice(0, 16).toUpperCase();
    await insertBooking(ref, 'cancelled', nonce);

    const payload = {
      status: 'success',
      txnid: ref,
      amount: '1000.00',
      productinfo: `AgnelBooking_${ref}`,
      firstname: 'Replay Guard Test',
      email: 'replay-guard@example.com',
    };
    const hash = computeCallbackHash(payload);

    const form = new URLSearchParams();
    form.set('status', payload.status);
    form.set('txnid', payload.txnid);
    form.set('mihpayid', 'MIHPAYID_REPLAYED');
    form.set('amount', payload.amount);
    form.set('productinfo', payload.productinfo);
    form.set('firstname', payload.firstname);
    form.set('email', payload.email);
    form.set('hash', hash);

    const request = new Request('http://localhost:3000/api/payment/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });

    const response = await POST(request);
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toContain('/dashboard');

    const row = await queryOne<{ payment_status: string; payu_mihpayid: string | null }>(
      'SELECT payment_status, payu_mihpayid FROM bookings WHERE booking_ref = ?',
      [ref]
    );
    expect(row?.payment_status).toBe('cancelled');
    // mihpayid from the replayed callback must not have been written either —
    // no part of this replay should touch the row at all.
    expect(row?.payu_mihpayid).not.toBe('MIHPAYID_REPLAYED');
  });
});
