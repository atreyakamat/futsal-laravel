import { describe, it, expect } from 'vitest';
import { generateTicketDownloadToken, verifyTicketDownloadToken } from '@/lib/ticket-token';

describe('ticket download token', () => {
  it('round-trips: a token generated for an identifier verifies against that same identifier', () => {
    const token = generateTicketDownloadToken('REF-ABCD1234');
    expect(verifyTicketDownloadToken('REF-ABCD1234', token)).toBe(true);
  });

  it('rejects a token when checked against a different identifier', () => {
    const token = generateTicketDownloadToken('REF-ABCD1234');
    expect(verifyTicketDownloadToken('REF-DIFFERENT', token)).toBe(false);
  });

  it('rejects a tampered token', () => {
    const token = generateTicketDownloadToken('REF-ABCD1234');
    const tampered = token.slice(0, -2) + 'zz';
    expect(verifyTicketDownloadToken('REF-ABCD1234', tampered)).toBe(false);
  });

  it('rejects an already-expired token', () => {
    const expiredToken = generateTicketDownloadToken('REF-ABCD1234', -1000);
    expect(verifyTicketDownloadToken('REF-ABCD1234', expiredToken)).toBe(false);
  });

  it('rejects a missing token', () => {
    expect(verifyTicketDownloadToken('REF-ABCD1234', null)).toBe(false);
    expect(verifyTicketDownloadToken('REF-ABCD1234', undefined)).toBe(false);
    expect(verifyTicketDownloadToken('REF-ABCD1234', '')).toBe(false);
  });

  it('rejects garbage input without throwing', () => {
    expect(verifyTicketDownloadToken('REF-ABCD1234', 'not-a-valid-token%%%')).toBe(false);
  });
});
