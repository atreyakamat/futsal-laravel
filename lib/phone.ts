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
  
  // If it's a 10-digit number, assume Indian country code 91 and prepend it
  if (clean.length === 10 && /^\d+$/.test(clean)) {
    return '91' + clean;
  }
  
  // If it is 12 digits starting with 91, return as is
  if (clean.length === 12 && clean.startsWith('91') && /^\d+$/.test(clean)) {
    return clean;
  }
  
  return clean;
}
