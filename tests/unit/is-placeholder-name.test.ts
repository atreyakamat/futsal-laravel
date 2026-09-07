/**
 * Regression guard for lib/domain.ts's isPlaceholderName — added so a name
 * fabricated by the old findOrCreateUserByIdentifier() (email local-part, or
 * the literal 'Player') is treated as absent everywhere it's read for
 * display/pre-fill, without needing a data backfill. See openspec change
 * fix-checkout-customer-details.
 */
import { describe, it, expect } from 'vitest';
import { isPlaceholderName } from '@/lib/domain';

describe('isPlaceholderName', () => {
  it('treats a blank or whitespace-only name as a placeholder', () => {
    expect(isPlaceholderName('', 'basil@example.com')).toBe(true);
    expect(isPlaceholderName('   ', 'basil@example.com')).toBe(true);
    expect(isPlaceholderName(null, 'basil@example.com')).toBe(true);
    expect(isPlaceholderName(undefined, 'basil@example.com')).toBe(true);
  });

  it('treats the generic mobile-signup default "Player" as a placeholder, case-insensitively', () => {
    expect(isPlaceholderName('Player', '9876543210')).toBe(true);
    expect(isPlaceholderName('player', '9876543210')).toBe(true);
    expect(isPlaceholderName('PLAYER', '9876543210')).toBe(true);
  });

  it('treats a name equal to the email local-part as a placeholder, case-insensitively', () => {
    expect(isPlaceholderName('basilrjose', 'basilrjose@gmail.com')).toBe(true);
    expect(isPlaceholderName('BasilRJose', 'basilrjose@gmail.com')).toBe(true);
  });

  it('does not flag a real name that happens to differ from the email prefix', () => {
    expect(isPlaceholderName('Basil Jose', 'basilrjose@gmail.com')).toBe(false);
    expect(isPlaceholderName('Rahul', 'rahul.kumar@example.com')).toBe(false);
  });

  it('does not match the local part against a placeholder account email', () => {
    // user-xxxxxxxx@agnelarena.com placeholder emails aren't a real local
    // part to compare against — a genuine name shouldn't be cleared by it.
    expect(isPlaceholderName('user-1a2b3c4d', 'user-1a2b3c4d@agnelarena.com')).toBe(false);
    expect(isPlaceholderName('Rahul', 'user-1a2b3c4d@agnelarena.com')).toBe(false);
  });

  it('handles a missing email gracefully (mobile-only account, name not blank/Player)', () => {
    expect(isPlaceholderName('Rahul', null)).toBe(false);
    expect(isPlaceholderName('Rahul', undefined)).toBe(false);
  });
});
