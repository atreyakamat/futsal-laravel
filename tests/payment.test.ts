import { describe, it, expect } from 'vitest';
import { generatePayuHash, verifyPayuResponseHash } from '@/lib/payment';

describe('Payment Callback & Signature Validation', () => {
  it('should verify correct PayU response hashes and reject invalid hashes', () => {
    // Mock parameters matching verifyPayuResponseHash expected inputs
    const params = {
      status: 'success',
      txnid: 'REF-BOOK-12345',
      amount: '500.00',
      productinfo: 'Futsal booking',
      firstname: 'Player',
      email: 'player@example.com',
    };

    // Calculate a valid hash based on the formula: salt|status|||||||||||email|firstname|productinfo|amount|txnid|key
    // Let's use test credentials. In tests, config defaults to empty strings if not configured.
    // Let's test the signature validation behavior directly.
    const key = process.env.PAYU_MERCHANT_KEY || '';
    const salt = process.env.PAYU_SALT || '';

    const expectedHashSource = `${salt}|${params.status}|||||||||||${params.email}|${params.firstname}|${params.productinfo}|${params.amount}|${params.txnid}|${key}`;
    const crypto = require('crypto');
    const validHash = crypto.createHash('sha512').update(expectedHashSource).digest('hex').toLowerCase();

    // Verify valid hash
    const isValid = verifyPayuResponseHash({
      ...params,
      hash: validHash,
    });
    expect(isValid).toBe(true);

    // Verify invalid hash
    const isInvalid = verifyPayuResponseHash({
      ...params,
      hash: validHash + 'modified',
    });
    expect(isInvalid).toBe(false);

    // Verify missing hash
    const isMissing = verifyPayuResponseHash({
      ...params,
      hash: undefined,
    });
    expect(isMissing).toBe(false);
  });
});
