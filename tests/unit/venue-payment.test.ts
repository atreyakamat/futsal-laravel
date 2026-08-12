import { describe, it, expect } from 'vitest';
import { resolveBookingPaymentFields } from '@/lib/domain';
import { buildUpiPaymentUri } from '@/lib/qr';

describe('resolveBookingPaymentFields', () => {
  it('defaults to a normal online booking (pending, awaiting PayU)', () => {
    const result = resolveBookingPaymentFields({});
    expect(result).toEqual({ payment_status: 'pending', payment_method: 'online', venue_payment_status: 'NONE' });
  });

  it('marks free bookings as confirmed with no venue payment tracking', () => {
    const result = resolveBookingPaymentFields({ freeBooking: true });
    expect(result).toEqual({ payment_status: 'confirmed', payment_method: 'free', venue_payment_status: 'NONE' });
  });

  it('marks offline bookings as confirmed (slot held) but unpaid until staff collect it', () => {
    const result = resolveBookingPaymentFields({ offlinePayment: true });
    expect(result).toEqual({ payment_status: 'confirmed', payment_method: 'offline', venue_payment_status: 'UNPAID' });
  });

  it('free booking takes precedence if both flags are somehow set', () => {
    const result = resolveBookingPaymentFields({ freeBooking: true, offlinePayment: true });
    expect(result.payment_method).toBe('free');
  });
});

describe('buildUpiPaymentUri', () => {
  it('builds a standard upi:// deep link with the exact booking amount and reference', () => {
    const uri = buildUpiPaymentUri({
      vpa: 'arena@upi',
      payeeName: 'Agnel Arena',
      amount: 1250.5,
      note: 'REF-ABCD1234',
    });

    expect(uri.startsWith('upi://pay?')).toBe(true);
    const params = new URLSearchParams(uri.replace('upi://pay?', ''));
    expect(params.get('pa')).toBe('arena@upi');
    expect(params.get('pn')).toBe('Agnel Arena');
    expect(params.get('am')).toBe('1250.50');
    expect(params.get('cu')).toBe('INR');
    expect(params.get('tn')).toBe('REF-ABCD1234');
  });
});
