import { describe, it, expect } from 'vitest';
import { getDurationText } from '../../lib/slot-merge';

describe('Duration calculation (focused regression tests)', () => {
  it('20:00–22:00 -> 2 HRS', () => {
    // using actual en-dash
    const res = getDurationText(['20:00–22:00']);
    expect(res).toBe('2 HRS');
  });

  it('10:00–11:00 -> 1 HR', () => {
    const res = getDurationText(['10:00–11:00']);
    expect(res).toBe('1 HR');
  });

  it('09:30–11:00 -> 1.5 HRS', () => {
    const res = getDurationText(['09:30–11:00']);
    expect(res).toBe('1.5 HRS');
  });

  it('two consecutive 1-hour slots -> 2 HRS', () => {
    const res = getDurationText(['20:00-21:00', '21:00-22:00']);
    expect(res).toBe('2 HRS');
  });

  it('array of objects -> 2 HRS', () => {
    const res = getDurationText([{ time_slot: '20:00-22:00' }] as any);
    expect(res).toBe('2 HRS');
  });

  it('multiple selected slots -> correct aggregate duration', () => {
    const res = getDurationText(['09:00-10:00', '10:00-11:30', '12:00-12:30']);
    // 1 + 1.5 + 0.5 = 3 HRS
    expect(res).toBe('3 HRS');
  });
});
