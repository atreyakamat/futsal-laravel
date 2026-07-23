import { describe, it, expect } from 'vitest';
import { normalizePhoneNumber } from '../../lib/phone';

describe('normalizePhoneNumber', () => {
  it('prepends the 91 country code to a bare 10-digit number', () => {
    expect(normalizePhoneNumber('7744020601')).toBe('917744020601');
  });

  it('strips spaces, dashes, parentheses and a leading + before normalizing', () => {
    expect(normalizePhoneNumber('+91 77440 20601')).toBe('917744020601');
    expect(normalizePhoneNumber('77440-20601')).toBe('917744020601');
    expect(normalizePhoneNumber('(774) 402-0601')).toBe('917744020601');
  });

  it('leaves an already-prefixed 12-digit number unchanged', () => {
    expect(normalizePhoneNumber('919876543210')).toBe('919876543210');
  });

  it('does not prepend 91 to numbers that are not a bare 10-digit Indian mobile number', () => {
    expect(normalizePhoneNumber('12025550123')).toBe('12025550123'); // e.g. a US number
    expect(normalizePhoneNumber('123456')).toBe('123456'); // too short
  });

  it('returns an empty string for empty input', () => {
    expect(normalizePhoneNumber('')).toBe('');
  });
});
