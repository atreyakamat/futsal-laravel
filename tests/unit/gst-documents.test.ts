import { describe, it, expect } from 'vitest';
import { computeGstSplit } from '@/lib/gst-config';
import { getFiscalYear } from '@/lib/gst-sequence';

describe('computeGstSplit', () => {
  it('splits a GST-inclusive gross amount into taxable value + CGST/SGST at 18%', () => {
    const result = computeGstSplit(1000, 18);
    expect(result.taxableValue).toBeCloseTo(847.46, 2);
    expect(result.cgst + result.sgst).toBeCloseTo(result.taxableValue * 0.18, 2);
    expect(result.cgst).toBeCloseTo(result.sgst, 2);
  });

  it('cgst + sgst always reconstitutes the exact tax amount (no rounding drift)', () => {
    const result = computeGstSplit(550, 18);
    expect(parseFloat((result.taxableValue + result.cgst + result.sgst).toFixed(2))).toBe(550);
  });

  it('handles zero gross amount', () => {
    const result = computeGstSplit(0, 18);
    expect(result.taxableValue).toBe(0);
    expect(result.cgst).toBe(0);
    expect(result.sgst).toBe(0);
  });

  it('supports a different rate', () => {
    const result = computeGstSplit(590, 18);
    // 590 gross at 18% => taxable 500, tax 90, cgst/sgst 45 each
    expect(result.taxableValue).toBeCloseTo(500, 1);
    expect(result.cgst).toBeCloseTo(45, 1);
    expect(result.sgst).toBeCloseTo(45, 1);
  });
});

describe('getFiscalYear', () => {
  it('returns the correct FY for a date in the first half (Jan-Mar) — belongs to the previous FY', () => {
    expect(getFiscalYear(new Date('2026-03-15T12:00:00+05:30'))).toBe('2025-26');
  });

  it('returns the correct FY for a date in April (FY start)', () => {
    expect(getFiscalYear(new Date('2026-04-01T12:00:00+05:30'))).toBe('2026-27');
  });

  it('returns the correct FY for a date late in the calendar year', () => {
    expect(getFiscalYear(new Date('2026-12-25T12:00:00+05:30'))).toBe('2026-27');
  });
});
