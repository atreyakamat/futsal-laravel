import { describe, it, expect } from 'vitest';
import { calculateRefundAmount } from '../../lib/refund-policy';

describe('Refund calculation', () => {
  it('Percentage mode: 5% of 2000 => 100 fee, 1900 refund', () => {
    const res = calculateRefundAmount(2000, { mode: 'PERCENTAGE', value: 5 });
    expect(res.grossAmount).toBe(2000);
    expect(res.serviceFee).toBe(100);
    expect(res.refundAmount).toBe(1900);
    expect(res.feeMode).toBe('PERCENTAGE');
  });

  it('Fixed mode: 300 fixed on 2000 => 1700 refund', () => {
    const res = calculateRefundAmount(2000, { mode: 'FIXED', value: 300 });
    expect(res.serviceFee).toBe(300);
    expect(res.refundAmount).toBe(1700);
    expect(res.feeMode).toBe('FIXED');
  });

  it('Fixed fee cannot exceed gross amount', () => {
    const res = calculateRefundAmount(200, { mode: 'FIXED', value: 500 });
    expect(res.serviceFee).toBe(200);
    expect(res.refundAmount).toBe(0);
  });

  it('Invalid values fallback and do not produce negative refunds', () => {
    const res = calculateRefundAmount(1000, { mode: 'PERCENTAGE', value: -5 as any });
    // fallback to default 5%
    expect(res.serviceFee).toBe(50);
    expect(res.refundAmount).toBe(950);
  });
});
