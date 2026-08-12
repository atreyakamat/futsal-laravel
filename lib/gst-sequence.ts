import { transaction } from '@/lib/db';

export type GstDocType = 'TI' | 'CN';

/**
 * Indian financial year, IST: April 1 - March 31, e.g. "2025-26".
 */
export function getFiscalYear(date: Date = new Date()): string {
  const istDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const year = istDate.getFullYear();
  const month = istDate.getMonth() + 1; // 1-12
  const startYear = month >= 4 ? year : year - 1;
  const endYearShort = String((startYear + 1) % 100).padStart(2, '0');
  return `${startYear}-${endYearShort}`;
}

/**
 * Atomically allocates the next sequential number for a document type within
 * the current fiscal year, and returns the formatted document number
 * (e.g. "TI-2026-0001"). Single global sequence across all arenas.
 */
export async function allocateDocumentNumber(docType: GstDocType, date: Date = new Date()): Promise<string> {
  const fiscalYear = getFiscalYear(date);

  const nextNumber = await transaction(async (connection) => {
    // Single atomic upsert-increment — avoids the race a separate
    // select-then-insert-or-update would have on the very first document of
    // a fiscal year, when two concurrent requests could both see "no row".
    const [rows] = await connection.execute<{ last_number: number }>(
      `INSERT INTO document_sequences (doc_type, fiscal_year, last_number, updated_at)
       VALUES (?, ?, 1, NOW())
       ON CONFLICT (doc_type, fiscal_year)
       DO UPDATE SET last_number = document_sequences.last_number + 1, updated_at = NOW()
       RETURNING last_number`,
      [docType, fiscalYear]
    );
    return rows[0].last_number;
  });

  const paddedNumber = String(nextNumber).padStart(4, '0');
  return `${docType}-${fiscalYear.slice(0, 4)}-${paddedNumber}`;
}
