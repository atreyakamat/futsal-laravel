/**
 * Normalizes a phone number string to a standard 12-digit Indian format (e.g. 919876543210)
 * by removing spaces, symbols, and prepending country code 91 if it is a 10-digit number.
 *
 * @param phone Raw phone number string input by user
 * @returns Cleaned, standardized 12-digit string
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';

  // Strip spaces, dashes, parentheses, and leading +
  const clean = phone.replace(/[\s\-\+\(\)]/g, '');

  // Prepend India country code if a bare 10-digit number was given
  if (/^[6-9]\d{9}$/.test(clean)) {
    return `91${clean}`;
  }

  return clean;
}
