import { describe, it, expect } from 'vitest';
import { query } from '../../lib/db';
import { getRefundPolicyConfig } from '../../lib/domain';

describe('Refund config persistence', () => {
  it('persists and reads percentage mode', async () => {
    await query("INSERT INTO settings (\"key\", value, created_at, updated_at) VALUES ('refund_fee_mode','PERCENTAGE', NOW(), NOW()) ON CONFLICT (\"key\") DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()");
    await query("INSERT INTO settings (\"key\", value, created_at, updated_at) VALUES ('refund_fee_value','5', NOW(), NOW()) ON CONFLICT (\"key\") DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()");
    const cfg = await getRefundPolicyConfig();
    expect(cfg.mode).toBe('PERCENTAGE');
    expect(cfg.value).toBe(5);
  });

  it('persists and reads fixed mode', async () => {
    await query("INSERT INTO settings (\"key\", value, created_at, updated_at) VALUES ('refund_fee_mode','FIXED', NOW(), NOW()) ON CONFLICT (\"key\") DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()");
    await query("INSERT INTO settings (\"key\", value, created_at, updated_at) VALUES ('refund_fee_value','300', NOW(), NOW()) ON CONFLICT (\"key\") DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()");
    const cfg = await getRefundPolicyConfig();
    expect(cfg.mode).toBe('FIXED');
    expect(cfg.value).toBe(300);
  });
});
