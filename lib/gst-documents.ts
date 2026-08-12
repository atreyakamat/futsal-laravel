import { query, queryOne, getBookingsByRef } from '@/lib/domain';
import { getArenaPlaceOfSupply } from '@/lib/admin';
import { getGstConfig, computeGstSplit } from '@/lib/gst-config';
import { allocateDocumentNumber } from '@/lib/gst-sequence';

/**
 * Invoice-at-payment model: issues the Tax Invoice the instant a booking's
 * payment is confirmed (online or at-venue) — invoice date = payment date =
 * time of supply, so no separate advance/receipt-voucher step is needed.
 *
 * Never throws — a GST document failure must not block or roll back an
 * already-confirmed payment. Failures are logged loudly so they can be
 * caught by the "documents needing attention" admin view and backfilled.
 */
export async function issueTaxInvoice(bookingRef: string): Promise<{ success: boolean; invoiceNo?: string; error?: string }> {
  try {
    const bookings = await getBookingsByRef(bookingRef);
    if (!bookings || bookings.length === 0) {
      throw new Error('Booking not found');
    }

    const first = bookings[0];

    // Free bookings involve no consideration — no invoice required.
    if (first.is_free_booking) {
      return { success: true };
    }

    const grossAmount = bookings.reduce((sum, b) => sum + Number(b.amount), 0);
    if (grossAmount <= 0) {
      return { success: true };
    }

    // Idempotency: never double-invoice the same booking group.
    const existing = await queryOne<{ id: number }>(`SELECT id FROM tax_invoices WHERE booking_ref = ? LIMIT 1`, [bookingRef]);
    if (existing) {
      return { success: true, invoiceNo: undefined };
    }

    const placeOfSupply = await getArenaPlaceOfSupply(first.arena_id);
    if (!placeOfSupply) {
      throw new Error(`Arena ${first.arena_id} has no GST place-of-supply configured`);
    }

    const gstConfig = await getGstConfig();
    if (!gstConfig.gstin || !gstConfig.legalName) {
      throw new Error('Trust GSTIN/legal name not configured in GST settings');
    }

    const { taxableValue, cgst, sgst } = computeGstSplit(grossAmount, gstConfig.rate);
    const mergedSlots = bookings.map((b) => b.time_slot).join(', ');
    const invoiceNo = await allocateDocumentNumber('TI');

    await query(
      `INSERT INTO tax_invoices (
        booking_ref, invoice_no, issue_datetime, gross_amount, taxable_value, cgst, sgst, igst,
        rate, hsn_sac, place_of_supply, gstin, legal_name, registered_address,
        customer_name, customer_mobile, customer_email, description, created_at
      ) VALUES (?, ?, NOW(), ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        bookingRef,
        invoiceNo,
        grossAmount,
        taxableValue,
        cgst,
        sgst,
        gstConfig.rate,
        gstConfig.hsnSac,
        placeOfSupply,
        gstConfig.gstin,
        gstConfig.legalName,
        gstConfig.registeredAddress,
        first.customer_name,
        first.customer_mobile,
        first.customer_email,
        `Turf booking — Slot ${first.booking_date} ${mergedSlots}`,
      ]
    );

    return { success: true, invoiceNo };
  } catch (err: any) {
    console.error('[GST] Failed to issue Tax Invoice for', bookingRef, err);
    return { success: false, error: err?.message || 'Unknown error' };
  }
}

/**
 * Issues a Credit Note reversing a previously-issued Tax Invoice's tax
 * liability, proportional to the refund amount. No-ops (returns success with
 * no note) if no invoice exists for this booking — nothing to reverse.
 */
export async function issueCreditNote(bookingRef: string, refundAmount: number, reason: string): Promise<{ success: boolean; noteNo?: string; error?: string }> {
  try {
    const invoice = await queryOne<{ id: number; rate: number }>(
      `SELECT id, rate FROM tax_invoices WHERE booking_ref = ? LIMIT 1`,
      [bookingRef]
    );

    if (!invoice) {
      // No invoice was ever issued for this booking (e.g. an offline
      // booking cancelled before any venue payment was collected) — there's
      // nothing to reverse.
      return { success: true };
    }

    if (refundAmount <= 0) {
      return { success: true };
    }

    const { taxableValue, cgst, sgst } = computeGstSplit(refundAmount, Number(invoice.rate));
    const noteNo = await allocateDocumentNumber('CN');

    await query(
      `INSERT INTO credit_notes (
        booking_ref, linked_invoice_id, note_no, issue_date, amount,
        taxable_value_reversed, cgst_reversed, sgst_reversed, igst_reversed, reason, created_at
      ) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, 0, ?, NOW())`,
      [bookingRef, invoice.id, noteNo, refundAmount, taxableValue, cgst, sgst, reason]
    );

    return { success: true, noteNo };
  } catch (err: any) {
    console.error('[GST] Failed to issue Credit Note for', bookingRef, err);
    return { success: false, error: err?.message || 'Unknown error' };
  }
}
