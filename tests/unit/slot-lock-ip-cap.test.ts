/**
 * Regression guard for the per-IP concurrent-slot-lock cap: a client
 * holding MAX_ACTIVE_LOCKS_PER_IP active locks (spread across any number of
 * self-chosen session ids, since session id is client-controlled and free
 * to rotate) cannot lock one more, while a different IP is unaffected, and
 * a normal customer well under the cap — including renewing a lock their
 * own session already holds — is unaffected either way.
 * See openspec change fix-payment-replay-and-slot-lock-abuse.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { query, lockSlots, MAX_ACTIVE_LOCKS_PER_IP, ensureSchemaColumns } from '@/lib/domain';

const ARENA_ID = 1;
const BOOKING_DATE = '2099-01-01'; // far future — never "already started"

// Derives a fake but stable last-octet from the nonce itself (not wall-clock
// modulo) so re-running this file moments later can never collide an IP
// from this run with one from the last — every value here is a pure
// function of `nonce`, which is unique per run.
function octetFromNonce(nonce: string, salt: string): number {
  let hash = 0;
  for (const ch of `${nonce}:${salt}`) hash = (hash * 31 + ch.charCodeAt(0)) % 200;
  return hash + 1;
}

describe('lockSlots — per-IP concurrent lock cap', () => {
  const nonce = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const cappedIp = `203.0.113.${octetFromNonce(nonce, 'capped')}`; // TEST-NET-3, safe placeholder range
  const otherIp = `198.51.100.${octetFromNonce(nonce, 'other')}`; // TEST-NET-2

  beforeAll(async () => {
    await ensureSchemaColumns();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    // Fill cappedIp up to the cap across many distinct (fake) sessions —
    // exactly what a script rotating session ids to dodge a per-session
    // limit would produce.
    for (let i = 0; i < MAX_ACTIVE_LOCKS_PER_IP; i++) {
      await query(
        `INSERT INTO slot_locks (arena_id, booking_date, time_slot, session_id, locked_at, expires_at, client_ip)
         VALUES (?, ?, ?, ?, NOW(), ?, ?)`,
        [ARENA_ID, BOOKING_DATE, `filler-${nonce}-${i}`, `fake-session-${nonce}-${i}`, expiresAt, cappedIp]
      );
    }
  });

  it('rejects one more lock for an IP already at the cap', async () => {
    const result = await lockSlots(ARENA_ID, BOOKING_DATE, [`target-${nonce}`], `attacker-session-${nonce}`, cappedIp);
    expect(result.locked).toEqual([]);
    expect(result.failed).toEqual([`target-${nonce}`]);
  });

  it('still allows a different IP to lock the same slot', async () => {
    const result = await lockSlots(ARENA_ID, BOOKING_DATE, [`target-${nonce}`], `other-session-${nonce}`, otherIp);
    expect(result.locked).toEqual([`target-${nonce}`]);
    expect(result.failed).toEqual([]);
  });

  it('lets the capped IP renew a lock its own session already holds', async () => {
    // The renewing session must match one of the fixture rows already
    // counted for cappedIp — renewal shouldn't need fresh budget.
    const ownSlot = `filler-${nonce}-0`;
    const ownSession = `fake-session-${nonce}-0`;
    const result = await lockSlots(ARENA_ID, BOOKING_DATE, [ownSlot], ownSession, cappedIp);
    expect(result.locked).toEqual([ownSlot]);
    expect(result.failed).toEqual([]);
  });

  it('a normal customer well under the cap locks several slots without issue', async () => {
    const freshIp = `192.0.2.${octetFromNonce(nonce, 'fresh')}`; // TEST-NET-1
    const slots = [`normal-${nonce}-a`, `normal-${nonce}-b`, `normal-${nonce}-c`];
    const result = await lockSlots(ARENA_ID, BOOKING_DATE, slots, `normal-session-${nonce}`, freshIp);
    expect(result.locked).toEqual(slots);
    expect(result.failed).toEqual([]);
  });

  it('a request with no attributable IP (null) is never capped', async () => {
    const slots = [`nullip-${nonce}-a`];
    const result = await lockSlots(ARENA_ID, BOOKING_DATE, slots, `null-ip-session-${nonce}`, null);
    expect(result.locked).toEqual(slots);
    expect(result.failed).toEqual([]);
  });
});
