import { query, setSetting } from '@/lib/domain';

export interface GstConfig {
  gstin: string | null;
  legalName: string | null;
  registeredAddress: string | null;
  hsnSac: string;
  rate: number;
}

const DEFAULT_HSN_SAC = '997212';
const DEFAULT_RATE = 18;

const SETTING_KEYS = {
  gstin: 'gst_gstin',
  legalName: 'gst_legal_name',
  registeredAddress: 'gst_registered_address',
  hsnSac: 'gst_hsn_sac',
  rate: 'gst_rate',
} as const;

export async function getGstConfig(): Promise<GstConfig> {
  const rows = await query<{ key: string; value: string | null }>(
    `SELECT "key", value FROM settings WHERE "key" IN (?, ?, ?, ?, ?)`,
    Object.values(SETTING_KEYS)
  );
  const byKey = new Map(rows.map((r) => [r.key, r.value]));

  const rateRaw = byKey.get(SETTING_KEYS.rate);
  const parsedRate = rateRaw ? parseFloat(rateRaw) : NaN;

  return {
    gstin: byKey.get(SETTING_KEYS.gstin) || null,
    legalName: byKey.get(SETTING_KEYS.legalName) || null,
    registeredAddress: byKey.get(SETTING_KEYS.registeredAddress) || null,
    hsnSac: byKey.get(SETTING_KEYS.hsnSac) || DEFAULT_HSN_SAC,
    rate: !isNaN(parsedRate) && parsedRate >= 0 ? parsedRate : DEFAULT_RATE,
  };
}

export async function setGstConfig(input: Partial<{
  gstin: string;
  legalName: string;
  registeredAddress: string;
  hsnSac: string;
  rate: number;
}>) {
  if (input.gstin !== undefined) await setSetting(SETTING_KEYS.gstin, input.gstin);
  if (input.legalName !== undefined) await setSetting(SETTING_KEYS.legalName, input.legalName);
  if (input.registeredAddress !== undefined) await setSetting(SETTING_KEYS.registeredAddress, input.registeredAddress);
  if (input.hsnSac !== undefined) await setSetting(SETTING_KEYS.hsnSac, input.hsnSac);
  if (input.rate !== undefined) await setSetting(SETTING_KEYS.rate, String(input.rate));
}

/** GST-inclusive gross amount -> taxable value + CGST/SGST split. */
export function computeGstSplit(grossAmount: number, rate: number): {
  taxableValue: number;
  cgst: number;
  sgst: number;
  tax: number;
} {
  const taxableValue = parseFloat((grossAmount * (100 / (100 + rate))).toFixed(2));
  const tax = parseFloat((grossAmount - taxableValue).toFixed(2));
  const cgst = parseFloat((tax / 2).toFixed(2));
  const sgst = parseFloat((tax - cgst).toFixed(2));
  return { taxableValue, cgst, sgst, tax };
}
