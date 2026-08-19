import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query as dbQuery, queryOne, transaction } from '@/lib/db';
import type { ArenaSummary, BookingRow, BookingGroup, BookingSlotItem, PricingRow, SlotLockRow } from '@/lib/types';
import { getBookingTimeRange, evaluateRescheduleEligibility, getMaxRescheduleDate, RESCHEDULE_MAX_WINDOW_DAYS } from '@/lib/refund-policy';
import { mergeSlots } from '@/lib/slot-merge';

// Export query for use in other modules
export const query = dbQuery;
export { queryOne, transaction } from '@/lib/db';

export async function ensureSchemaColumns() {
  try {
    await dbQuery(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_status VARCHAR(50) DEFAULT 'NONE'`);
    await dbQuery(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_reviewed_at TIMESTAMP NULL`);
    await dbQuery(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_reviewed_by INTEGER NULL`);
    await dbQuery(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_reason TEXT NULL`);
    await dbQuery(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_processed_at TIMESTAMP NULL`);
    await dbQuery(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payu_refund_request_id TEXT NULL`);
    await dbQuery(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS verification_method VARCHAR(50) DEFAULT 'qr'`);
  } catch {
    // Columns already exist or handled
  }
}

export async function getActiveArenas(): Promise<ArenaSummary[]> {
  const rows = await dbQuery<{
    id: number;
    name: string;
    slug: string;
    address: string | null;
    description: string | null;
    cover_image: string | null;
    status: string;
    min_price: string | number | null;
    bot_enabled: number | null;
    gmaps_link: string | null;
  }>(
    `SELECT a.id, a.name, a.slug, a.address, a.description, a.cover_image, a.status,
            COALESCE(MIN(p.price), 500) AS min_price,
            a.bot_enabled, a.gmaps_link
       FROM arenas a
       LEFT JOIN pricings p ON p.arena_id = a.id
      WHERE a.status = 'active'
   GROUP BY a.id, a.name, a.slug, a.address, a.description, a.cover_image, a.status, a.bot_enabled, a.gmaps_link
   ORDER BY a.name ASC`
  );

  return rows.map((arena) => ({
    ...arena,
    min_price: Number(arena.min_price ?? 500),
  }));
}

export async function getArenaBySlug(slug: string) {
  return queryOne<{
    id: number;
    name: string;
    slug: string;
    address: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    whatsapp_number: string | null;
    logo_url: string | null;
    cover_image: string | null;
    description: string | null;
    status: string;
    bot_enabled: number | null;
    gmaps_link: string | null;
  }>('SELECT * FROM arenas WHERE slug = ? LIMIT 1', [slug]);
}

export async function getArenaById(arenaId: number) {
  return queryOne<{
    id: number;
    name: string;
    slug: string;
    address: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    logo_url: string | null;
    cover_image: string | null;
    description: string | null;
    status: string;
    bot_enabled: number | null;
    gmaps_link: string | null;
  }>('SELECT * FROM arenas WHERE id = ? LIMIT 1', [arenaId]);
}

export async function getArenaPricing(arenaId: number) {
  return dbQuery<PricingRow>('SELECT * FROM pricings WHERE arena_id = ? ORDER BY time_slot ASC', [arenaId]);
}

/**
 * Resolves exactly one price per time_slot for a specific calendar date —
 * a day-specific override row (day_of_week matching that date's weekday)
 * wins over the "every day" default (day_of_week IS NULL) when both exist
 * for the same time_slot. Use this (not getArenaPricing) anywhere a real
 * booking date is known — availability display, checkout totals, and the
 * actual amount charged at booking time — since getArenaPricing's flat,
 * ungrouped list can return multiple rows for the same time_slot once
 * day-specific overrides exist, which silently produces the wrong price
 * if callers key results by time_slot alone.
 */
export async function getArenaPricingForDate(arenaId: number, dateStr: string) {
  const dayOfWeek = new Date(`${dateStr}T00:00:00`).getDay();
  return dbQuery<PricingRow>(
    `SELECT DISTINCT ON (time_slot) *
       FROM pricings
      WHERE arena_id = ? AND (day_of_week = ? OR day_of_week IS NULL)
      ORDER BY time_slot, day_of_week NULLS LAST`,
    [arenaId, dayOfWeek]
  );
}

export async function expirePendingBookings() {
  await dbQuery(
    `UPDATE bookings 
        SET payment_status = 'failed', updated_at = NOW() 
      WHERE payment_status = 'pending' 
        AND created_at < NOW() - INTERVAL '15 minutes'`
  );
}

export async function getBookingsByRef(bookingRef: string) {
  await ensureSchemaColumns();
  return dbQuery<BookingRow>('SELECT * FROM bookings WHERE booking_ref = ? ORDER BY time_slot ASC', [bookingRef]);
}

/**
 * Domain Aggregate Helper:
 * Groups raw database `BookingRow[]` into single structured `BookingGroup` entities (Parent Booking).
 * Ensures that multi-slot checkouts sharing the same `booking_ref` are treated as ONE booking unit.
 */
export function groupBookingRows(rows: BookingRow[]): BookingGroup[] {
  const groupsMap = new Map<string, BookingRow[]>();
  for (const row of rows) {
    if (!groupsMap.has(row.booking_ref)) {
      groupsMap.set(row.booking_ref, []);
    }
    groupsMap.get(row.booking_ref)!.push(row);
  }

  const result: BookingGroup[] = [];
  for (const [ref, groupRows] of groupsMap.entries()) {
    const first = groupRows[0];
    const totalAmount = groupRows.reduce((sum, r) => sum + Number(r.amount), 0);
    const slots: BookingSlotItem[] = groupRows.map((r) => ({
      id: r.id,
      ticket_number: r.ticket_number,
      booking_date: r.booking_date,
      time_slot: r.time_slot,
      amount: Number(r.amount),
      checked_in: Boolean(r.checked_in),
    }));

    result.push({
      booking_ref: ref,
      primary_ticket_number: first.ticket_number,
      arena_id: first.arena_id,
      user_id: first.user_id,
      customer_name: first.customer_name,
      customer_mobile: first.customer_mobile,
      customer_email: first.customer_email,
      booking_date: first.booking_date,
      total_amount: totalAmount,
      payment_status: first.payment_status,
      payment_method: first.payment_method,
      payu_mihpayid: first.payu_mihpayid,
      is_free_booking: Boolean(first.is_free_booking),
      cancellation_requested: Boolean(first.cancellation_requested),
      cancellation_reason: first.cancellation_reason ?? null,
      refund_amount: first.refund_amount ? Number(first.refund_amount) : null,
      venue_payment_status: first.venue_payment_status || 'NONE',
      venue_payment_reference: first.venue_payment_reference ?? null,
      refund_status: first.refund_status || (first.payment_status === 'refunded' ? 'REFUNDED' : first.cancellation_requested ? 'PENDING_REVIEW' : 'NONE'),
      refund_reviewed_at: first.refund_reviewed_at ?? null,
      refund_reviewed_by: first.refund_reviewed_by ?? null,
      refund_reason: first.refund_reason ?? first.cancellation_reason ?? null,
      refund_processed_at: first.refund_processed_at ?? null,
      created_at: first.created_at,
      updated_at: first.updated_at,
      slots,
    });
  }

  return result;
}

export async function getBookingGroup(bookingRef: string): Promise<BookingGroup | null> {
  const rows = await getBookingsByRef(bookingRef);
  if (!rows || rows.length === 0) return null;
  return groupBookingRows(rows)[0] ?? null;
}

export async function getGroupedBookingsForUser(userId: number): Promise<BookingGroup[]> {
  await ensureSchemaColumns();
  const rows = await dbQuery<BookingRow>(
    `SELECT * FROM bookings
      WHERE user_id = ?
        AND payment_status IN ('confirmed', 'pending', 'cancelled', 'refunded')
      ORDER BY created_at DESC`,
    [userId]
  );
  return groupBookingRows(rows);
}

export async function getBookingsForUser(userId: number) {
  await ensureSchemaColumns();
  return dbQuery<BookingRow>(
    `SELECT * FROM bookings
      WHERE user_id = ?
        AND payment_status IN ('confirmed', 'pending', 'cancelled', 'refunded')
      ORDER BY created_at DESC`,
    [userId]
  );
}

export async function getBookingByTicket(ticketNumber: string) {
  await ensureSchemaColumns();
  return queryOne<BookingRow>('SELECT * FROM bookings WHERE ticket_number = ? OR booking_ref = ? LIMIT 1', [ticketNumber, ticketNumber]);
}

export async function getBookingsForDate(arenaId: number, bookingDate: string) {
  await expirePendingBookings();
  return dbQuery<BookingRow>(
    `SELECT * FROM bookings
      WHERE arena_id = ?
        AND booking_date = ?
        AND payment_status IN ('pending', 'confirmed')`,
    [arenaId, bookingDate]
  );
}

export async function getBookedSlots(arenaId: number, bookingDate: string) {
  await expirePendingBookings();
  const rows = await dbQuery<{ time_slot: string }>(
    `SELECT time_slot FROM bookings
      WHERE arena_id = ?
        AND booking_date = ?
        AND payment_status IN ('pending', 'confirmed')`,
    [arenaId, bookingDate]
  );

  return rows.map((row) => row.time_slot);
}

export async function getLockedSlots(arenaId: number, bookingDate: string, sessionId?: string) {
  const rows = await dbQuery<{ time_slot: string }>(
    `SELECT time_slot FROM slot_locks
      WHERE arena_id = ?
        AND booking_date = ?
        AND expires_at > NOW()
        ${sessionId ? 'AND session_id != ?' : ''}`,
    sessionId ? [arenaId, bookingDate, sessionId] : [arenaId, bookingDate]
  );

  return rows.map((row) => row.time_slot);
}

export async function getMyLockedSlots(arenaId: number, bookingDate: string, sessionId: string) {
  const rows = await dbQuery<{ time_slot: string }>(
    `SELECT time_slot FROM slot_locks
      WHERE arena_id = ?
        AND booking_date = ?
        AND session_id = ?
        AND expires_at > NOW()`,
    [arenaId, bookingDate, sessionId]
  );

  return rows.map((row) => row.time_slot);
}

export async function lockSlots(arenaId: number, bookingDate: string, slots: string[], sessionId: string) {
  await expirePendingBookings();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const locked: string[] = [];
  const failed: string[] = [];

  await transaction(async (connection) => {
    for (const slot of slots) {
      const [bookedRows] = await connection.execute(
        `SELECT id FROM bookings
          WHERE arena_id = ?
            AND booking_date = ?
            AND time_slot = ?
            AND payment_status IN ('pending', 'confirmed')
          LIMIT 1 FOR UPDATE`,
        [arenaId, bookingDate, slot]
      );

      if ((bookedRows as any[])?.length > 0) {
        failed.push(slot);
        continue;
      }

      const [existingRows] = await connection.execute(
        `SELECT * FROM slot_locks
          WHERE arena_id = ?
            AND booking_date = ?
            AND time_slot = ?
          LIMIT 1 FOR UPDATE`,
        [arenaId, bookingDate, slot]
      );

      const existingLock = (existingRows as unknown as SlotLockRow[])[0];
      if (existingLock && existingLock.session_id !== sessionId && new Date(existingLock.expires_at) > new Date()) {
        failed.push(slot);
        continue;
      }

      if (existingLock) {
        await connection.execute(
          `UPDATE slot_locks
              SET session_id = ?, locked_at = NOW(), expires_at = ?
            WHERE id = ?`,
          [sessionId, expiresAt, existingLock.id]
        );
      } else {
        await connection.execute(
          `INSERT INTO slot_locks (arena_id, booking_date, time_slot, session_id, locked_at, expires_at)
           VALUES (?, ?, ?, ?, NOW(), ?)`,
          [arenaId, bookingDate, slot, sessionId, expiresAt]
        );
      }

      locked.push(slot);
    }
  });

  return { locked, failed };
}

export async function releaseLocks(sessionId: string, arenaId?: number, bookingDate?: string, slots?: string[] | null) {
  const clauses = ['session_id = ?'];
  const params: Array<string | number> = [sessionId];

  if (arenaId) {
    clauses.push('arena_id = ?');
    params.push(arenaId);
  }

  if (bookingDate) {
    clauses.push('booking_date = ?');
    params.push(bookingDate);
  }

  if (slots && slots?.length > 0) {
    clauses.push(`time_slot IN (${slots.map(() => '?').join(', ')})`);
    params.push(...slots);
  }

  await query(`DELETE FROM slot_locks WHERE ${clauses.join(' AND ')}`, params);
}

/**
 * Pure derivation of the booking's payment fields at creation time, factored
 * out so it can be unit-tested without a DB connection. freeBooking always
 * wins over offlinePayment if both are somehow set.
 */
export function resolveBookingPaymentFields(input: { freeBooking?: boolean; offlinePayment?: boolean }): {
  payment_status: 'confirmed' | 'pending';
  payment_method: 'free' | 'offline' | 'online';
  venue_payment_status: 'NONE' | 'UNPAID';
} {
  if (input.freeBooking) {
    return { payment_status: 'confirmed', payment_method: 'free', venue_payment_status: 'NONE' };
  }
  if (input.offlinePayment) {
    return { payment_status: 'confirmed', payment_method: 'offline', venue_payment_status: 'UNPAID' };
  }
  return { payment_status: 'pending', payment_method: 'online', venue_payment_status: 'NONE' };
}

export async function createBookingBatch(params: {
  arenaId: number;
  bookingDate: string;
  slots: string[];
  customerName: string;
  customerMobile: string;
  customerEmail: string | null;
  userId: number | null;
  sessionId: string;
  freeBooking?: boolean;
  offlinePayment?: boolean;
  // Manager-requested discount, applied per-slot (e.g. a discounted-price
  // approval request resolving) — takes priority over the normal pricing
  // lookup for every slot in this batch, same as freeBooking forcing 0.
  discountedSlotPrice?: number;
}) {
  await expirePendingBookings();
  const bookingRef = `REF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  // Date-aware: once day-specific pricing overrides exist, the flat
  // getArenaPricing() list can return more than one row for the same
  // time_slot — getArenaPricingForDate resolves exactly one price per
  // slot for this booking's actual date before it's used to charge anyone.
  const bookings = await getArenaPricingForDate(params.arenaId, params.bookingDate);
  const priceBySlot = new Map(bookings.map((row) => [row.time_slot, Number(row.price)]));
  const created: Array<{ booking_ref: string; ticket_number: string; time_slot: string; amount: number }> = [];
  let effectiveUserId = params.userId;

  await transaction(async (connection) => {
    if (!effectiveUserId) {
      const [userRows] = await connection.execute(
        `SELECT id FROM users WHERE customer_mobile = ? OR email = ? LIMIT 1`,
        [params.customerMobile, params.customerEmail || 'no-email@agnelarena.com']
      );
      
      const existingUser = (userRows as any[])[0];
      if (existingUser) {
        effectiveUserId = existingUser.id;
      } else {
        const [newUserRows] = await connection.execute(
          `INSERT INTO users (name, email, customer_mobile, role, created_at, updated_at)
           VALUES (?, ?, ?, 'player', NOW(), NOW())
           RETURNING id`,
          [params.customerName, params.customerEmail || `user-${crypto.randomUUID().slice(0, 8)}@agnelarena.com`, params.customerMobile]
        );
        effectiveUserId = (newUserRows as any[])[0].id;
      }
    }

    // If we have an authenticated user (effectiveUserId), update their profile
    // only for non-empty values provided in the booking payload. Do NOT overwrite
    // existing values with empty/nulls. Preserve uniqueness of email.
    if (effectiveUserId) {
      const [userRows] = await connection.execute(
        `SELECT id, name, email, customer_mobile FROM users WHERE id = ? LIMIT 1`,
        [effectiveUserId]
      );
      const currentUser = (userRows as any[])[0] || null;
      if (currentUser) {
        const updates: string[] = [];
        const paramsForUpdate: any[] = [];

        // Name: update if provided and non-empty and different
        if (params.customerName && params.customerName.trim() !== '' && params.customerName !== currentUser.name) {
          updates.push('name = ?');
          paramsForUpdate.push(params.customerName);
        }

        // Mobile: update if provided and non-empty and different
        if (params.customerMobile && params.customerMobile.trim() !== '' && params.customerMobile !== currentUser.customer_mobile) {
          updates.push('customer_mobile = ?');
          paramsForUpdate.push(params.customerMobile);
        }

        // Email: update if provided and non-empty and different and not used by another user
        if (params.customerEmail && params.customerEmail.trim() !== '' && params.customerEmail !== currentUser.email) {
          const [existingEmailRows] = await connection.execute(
            `SELECT id FROM users WHERE LOWER(email) = ? AND id != ? LIMIT 1`,
            [String(params.customerEmail).toLowerCase(), effectiveUserId]
          );
          if (((existingEmailRows as any[]) || []).length === 0) {
            updates.push('email = ?');
            paramsForUpdate.push(params.customerEmail);
          }
        }

        if (updates.length > 0) {
          paramsForUpdate.push(effectiveUserId);
          await connection.execute(
            `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
            paramsForUpdate
          );
        }
      }
    }

    for (const slot of params.slots) {
      const slotPrice = params.freeBooking
        ? 0
        : params.discountedSlotPrice !== undefined
          ? params.discountedSlotPrice
          : (priceBySlot.get(slot) ?? 500);

      const [bookedRows] = await connection.execute(
        `SELECT id FROM bookings
          WHERE arena_id = ?
            AND booking_date = ?
            AND time_slot = ?
            AND payment_status IN ('pending', 'confirmed')
          LIMIT 1 FOR UPDATE`,
        [params.arenaId, params.bookingDate, slot]
      );

      if ((bookedRows as any[])?.length > 0) {
        throw new Error(`Slot ${slot} has already been booked.`);
      }

      const ticketNumber = `TKT-${new Date().toISOString().slice(2, 10).replaceAll('-', '')}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;

      const { payment_status: paymentStatus, payment_method: paymentMethod, venue_payment_status: venuePaymentStatus } =
        resolveBookingPaymentFields({ freeBooking: params.freeBooking, offlinePayment: params.offlinePayment });

      await connection.execute(
        `INSERT INTO bookings (
          ticket_number, booking_ref, arena_id, user_id, booking_date, time_slot,
          customer_name, customer_mobile, customer_email, amount, payment_status,
          payment_method, notes, checked_in, is_free_booking, venue_payment_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, FALSE, ?, ?, NOW(), NOW())`,
        [
          ticketNumber,
          bookingRef,
          params.arenaId,
          effectiveUserId,
          params.bookingDate,
          slot,
          params.customerName,
          params.customerMobile,
          params.customerEmail,
          slotPrice,
          paymentStatus,
          paymentMethod,
          params.freeBooking ? true : false,
          venuePaymentStatus,
        ]
      );

      created.push({
        booking_ref: bookingRef,
        ticket_number: ticketNumber,
        time_slot: slot,
        amount: slotPrice,
      });
    }

    await connection.execute(`DELETE FROM slot_locks WHERE session_id = ? AND arena_id = ? AND booking_date = ?`, [
      params.sessionId,
      params.arenaId,
      params.bookingDate,
    ]);
  });

  return { bookingRef, created, userId: effectiveUserId };
}

export async function confirmPayment(bookingRef: string, mihpayid: string | null) {
  const bookings = await getBookingsByRef(bookingRef);

  if (!bookings || bookings.length === 0) {
    return null;
  }

  await transaction(async (connection) => {
    await connection.execute(
      `UPDATE bookings
          SET payment_status = 'confirmed', payu_mihpayid = ?, updated_at = NOW()
        WHERE booking_ref = ?`,
      [mihpayid, bookingRef]
    );
  });

  return bookings[0];
}

export async function markPaymentFailed(bookingRef: string) {
  await query(`UPDATE bookings SET payment_status = 'failed', updated_at = NOW() WHERE booking_ref = ?`, [bookingRef]);
}

export async function cancelBookingGroup(bookingRef: string, reason: string, refundAmount: number) {
  await ensureSchemaColumns();
  await query(
    `UPDATE bookings
        SET cancellation_requested = TRUE,
            payment_status = 'cancelled',
            refund_amount = ?,
            cancellation_reason = ?,
            refund_status = 'PENDING_REVIEW',
            updated_at = NOW()
      WHERE booking_ref = ?`,
    [refundAmount, reason, bookingRef]
  );
  return true;
}

export type RescheduleResult =
  | {
      success: true;
      oldBookingRef: string;
      newBookingRef: string;
      newTicketNumbers: string[];
      newDate: string;
      newSlots: string[];
      newTotal: number;
    }
  | { success: false; code: string; message: string };

/**
 * Moves a confirmed booking to a new slot instead of refunding it — see
 * evaluateRescheduleEligibility (lib/refund-policy.ts) for the eligibility
 * rules (24h cutoff, once-only, 30-day window) enforced here. The old
 * booking rows are marked cancelled/NOT_APPLICABLE (no refund — this is a
 * move, not a cancellation-with-payout) and linked via
 * rescheduled_to_ref/rescheduled_from_ref to a brand-new booking_ref with
 * fresh ticket_number(s), so old QR codes/tickets stop working and the
 * customer gets a genuinely new ticket to present at the gate.
 */
export async function rescheduleBooking(params: {
  bookingRef: string;
  userId: number;
  newDate: string;
  newSlots: string[];
}): Promise<RescheduleResult> {
  await ensureSchemaColumns();
  await expirePendingBookings();

  const oldRows = await dbQuery<BookingRow>(
    `SELECT * FROM bookings WHERE booking_ref = ? AND user_id = ? ORDER BY time_slot ASC`,
    [params.bookingRef, params.userId]
  );
  if (!oldRows || oldRows.length === 0) {
    return { success: false, code: 'NOT_FOUND', message: 'Booking not found.' };
  }

  const firstOld = oldRows[0];
  const oldSlots = oldRows.map((r) => r.time_slot);
  const eligibility = evaluateRescheduleEligibility(
    firstOld.booking_date,
    oldSlots,
    Date.now(),
    Boolean(firstOld.reschedule_used),
    firstOld.payment_status
  );
  if (!eligibility.allowed) {
    return { success: false, code: eligibility.code, message: eligibility.message };
  }

  if (params.newSlots.length !== oldSlots.length) {
    return {
      success: false,
      code: 'SLOT_COUNT_MISMATCH',
      message: `Pick exactly ${oldSlots.length} slot${oldSlots.length > 1 ? 's' : ''} to match your original booking.`,
    };
  }
  if (mergeSlots(params.newSlots).length !== 1) {
    return { success: false, code: 'NOT_CONTIGUOUS', message: 'The new slots must be contiguous (back-to-back) on the same date.' };
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const maxDate = getMaxRescheduleDate(firstOld.booking_date);
  if (params.newDate < todayStr) {
    return { success: false, code: 'PAST_DATE', message: 'Cannot reschedule to a past date.' };
  }
  if (params.newDate > maxDate) {
    return {
      success: false,
      code: 'OUTSIDE_WINDOW',
      message: `The new date must be within ${RESCHEDULE_MAX_WINDOW_DAYS} days of your original booking date (by ${maxDate}).`,
    };
  }

  const oldTotal = oldRows.reduce((sum, r) => sum + Number(r.amount), 0);
  const newPricing = await getArenaPricingForDate(firstOld.arena_id, params.newDate);
  const priceBySlot = new Map(newPricing.map((row) => [row.time_slot, Number(row.price)]));
  const newTotal = params.newSlots.reduce((sum, slot) => sum + (priceBySlot.get(slot) ?? 500), 0);
  if (newTotal > oldTotal) {
    return {
      success: false,
      code: 'PRICE_TOO_HIGH',
      message: `The new slots total ₹${newTotal}, which is more than your original ₹${oldTotal}. Pick slots priced at or below your original total.`,
    };
  }

  const newBookingRef = `REF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const newTicketNumbers: string[] = [];

  try {
    await transaction(async (connection) => {
      for (const slot of params.newSlots) {
        const [bookedRows] = await connection.execute(
          `SELECT id FROM bookings
            WHERE arena_id = ?
              AND booking_date = ?
              AND time_slot = ?
              AND payment_status IN ('pending', 'confirmed')
            LIMIT 1 FOR UPDATE`,
          [firstOld.arena_id, params.newDate, slot]
        );
        if ((bookedRows as any[])?.length > 0) {
          throw new Error(`SLOT_TAKEN:${slot}`);
        }

        const ticketNumber = `TKT-${new Date().toISOString().slice(2, 10).replaceAll('-', '')}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
        newTicketNumbers.push(ticketNumber);

        await connection.execute(
          `INSERT INTO bookings (
            ticket_number, booking_ref, arena_id, user_id, booking_date, time_slot,
            customer_name, customer_mobile, customer_email, amount, payment_status,
            payment_method, notes, checked_in, is_free_booking, venue_payment_status,
            rescheduled_from_ref, reschedule_used, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, NULL, FALSE, ?, ?, ?, TRUE, NOW(), NOW())`,
          [
            ticketNumber,
            newBookingRef,
            firstOld.arena_id,
            params.userId,
            params.newDate,
            slot,
            firstOld.customer_name,
            firstOld.customer_mobile,
            firstOld.customer_email,
            priceBySlot.get(slot) ?? 500,
            firstOld.payment_method,
            firstOld.is_free_booking,
            firstOld.venue_payment_status,
            params.bookingRef,
          ]
        );
      }

      await connection.execute(
        `UPDATE bookings
            SET payment_status = 'cancelled',
                cancellation_requested = FALSE,
                cancellation_reason = 'Rescheduled',
                refund_status = 'NOT_APPLICABLE',
                refund_amount = 0,
                reschedule_used = TRUE,
                rescheduled_to_ref = ?,
                updated_at = NOW()
          WHERE booking_ref = ?`,
        [newBookingRef, params.bookingRef]
      );
    });
  } catch (err: any) {
    const msg = String(err?.message || '');
    if (msg.startsWith('SLOT_TAKEN:')) {
      return { success: false, code: 'SLOT_TAKEN', message: `Slot ${msg.split(':')[1]} was just booked by someone else. Please pick different slots.` };
    }
    throw err;
  }

  return {
    success: true,
    oldBookingRef: params.bookingRef,
    newBookingRef,
    newTicketNumbers,
    newDate: params.newDate,
    newSlots: params.newSlots,
    newTotal,
  };
}

export async function getSetting(key: string) {
  return queryOne<{ key: string; value: string | null }>('SELECT "key", value FROM settings WHERE "key" = ? LIMIT 1', [key]);
}

export async function setSetting(key: string, value: string | null) {
  await query(
    `INSERT INTO settings ("key", value, created_at, updated_at)
     VALUES (?, ?, NOW(), NOW())
     ON CONFLICT ("key")
     DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, value]
  );
}

export async function getBooleanSetting(key: string, defaultValue = true) {
  const setting = await getSetting(key);
  if (!setting?.value) {
    return defaultValue;
  }

  return setting.value === 'true';
}

export async function storeOtp(identifier: string, otp: string) {
  const hashedOtp = await bcrypt.hash(otp, 10);

  await query(
    `INSERT INTO user_otps (identifier, otp, expires_at, created_at, updated_at)
     VALUES (?, ?, NOW() + INTERVAL '10 minutes', NOW(), NOW())
     ON CONFLICT (identifier)
     DO UPDATE SET otp = EXCLUDED.otp, expires_at = EXCLUDED.expires_at, updated_at = NOW()`,
    [identifier, hashedOtp]
  );
}

export async function verifyOtp(identifier: string, otp: string) {
  const row = await queryOne<{ id: number; otp: string; expires_at: string }>('SELECT * FROM user_otps WHERE identifier = ? LIMIT 1', [identifier]);

  if (!row) {
    return false;
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    return false;
  }

  return bcrypt.compare(otp, row.otp);
}

export async function removeOtp(identifier: string) {
  await query('DELETE FROM user_otps WHERE identifier = ?', [identifier]);
}

export async function findUserById(id: number) {
  return queryOne<{ id: number; name: string; email: string; customer_mobile: string | null; role: string }>(
    `SELECT id, name, email, customer_mobile, role FROM users WHERE id = ? LIMIT 1`,
    [id]
  );
}

export async function findUserByIdentifier(identifier: string) {
  return queryOne<{ id: number; name: string; email: string; customer_mobile: string | null; role: string }>(
    `SELECT id, name, email, customer_mobile, role
       FROM users
      WHERE email = ?
         OR customer_mobile = ?
      LIMIT 1`,
    [identifier, identifier]
  );
}

const PLACEHOLDER_EMAIL_PATTERN = /^user-[0-9a-f]{8}@agnelarena\.com$/i;

/** True for the auto-generated `user-xxxxxxxx@agnelarena.com` placeholder
 * assigned to OTP-only users with no real email — never show this in the UI. */
export function isPlaceholderEmail(email: string | null | undefined): boolean {
  return !!email && PLACEHOLDER_EMAIL_PATTERN.test(email);
}

export async function findOrCreateUserByIdentifier(identifier: string) {
  const existingUser = await findUserByIdentifier(identifier);
  if (existingUser) return existingUser;

  const isEmail = identifier.includes('@');
  const name = isEmail ? identifier.split('@')[0] : 'Player';
  const email = isEmail ? identifier : `user-${crypto.randomUUID().slice(0, 8)}@agnelarena.com`;
  const mobile = isEmail ? null : identifier;

  await query(
    `INSERT INTO users (name, email, customer_mobile, role, created_at, updated_at)
     VALUES (?, ?, ?, 'player', NOW(), NOW())`,
    [name, email, mobile]
  );
  
  return findUserByIdentifier(identifier);
}

export async function getSecurityBookings(ticketOrRef: string) {
  await ensureSchemaColumns();
  return dbQuery<BookingRow>(
    `SELECT * FROM bookings WHERE ticket_number = ? OR booking_ref = ? ORDER BY time_slot ASC`,
    [ticketOrRef, ticketOrRef]
  );
}

/**
 * Security Attendance Check-In Verification:
 * Validates ticket/reference and marks ALL slots under parent booking_ref as checked-in.
 */
export async function confirmEntryByTicket(
  ticketOrRef: string,
  checkedInByUserId: number | null,
  verificationMethod: 'qr' | 'manual' | 'ticket' = 'qr',
  now: number = Date.now()
): Promise<{
  success: boolean;
  code: 'ENTRY_APPROVED' | 'INVALID_TICKET' | 'ALREADY_CHECKED_IN' | 'CANCELLED' | 'REFUNDED' | 'EXPIRED';
  message: string;
  bookingGroup?: BookingGroup;
}> {
  await ensureSchemaColumns();
  const bookings = await getSecurityBookings(ticketOrRef);

  if (!bookings || bookings.length === 0) {
    return { success: false, code: 'INVALID_TICKET', message: 'Invalid Ticket.' };
  }

  const first = bookings[0];
  const ref = first.booking_ref;

  if (first.payment_status === 'refunded' || (first.refund_amount && Number(first.refund_amount) > 0 && first.refund_status === 'REFUNDED')) {
    return { success: false, code: 'REFUNDED', message: 'Ticket Refunded.' };
  }

  if (first.payment_status === 'cancelled' || first.cancellation_requested) {
    return { success: false, code: 'CANCELLED', message: 'Booking Cancelled.' };
  }

  if (first.checked_in) {
    return { success: false, code: 'ALREADY_CHECKED_IN', message: 'Already Checked In.' };
  }

  const timeSlots = bookings.map((b) => b.time_slot);
  const { bookingEnd } = getBookingTimeRange(first.booking_date, timeSlots);
  if (now >= bookingEnd.getTime()) {
    return { success: false, code: 'EXPIRED', message: 'Ticket Expired.' };
  }

  await query(
    `UPDATE bookings
        SET checked_in = TRUE,
            checked_in_at = NOW(),
            checked_in_by = ?,
            verification_method = ?,
            updated_at = NOW()
      WHERE booking_ref = ?`,
    [checkedInByUserId, verificationMethod, ref]
  );

  const updatedGroup = await getBookingGroup(ref);

  return {
    success: true,
    code: 'ENTRY_APPROVED',
    message: '✓ Entry Approved',
    bookingGroup: updatedGroup ?? undefined,
  };
}

/**
 * Computes unified Booking Lifecycle State across Customer, Admin, and Security portals.
 */
export function computeBookingLifecycleState(booking: {
  payment_status: string;
  cancellation_requested?: boolean;
  refund_amount?: number | null;
  checked_in?: boolean;
  booking_date: string;
  timeSlots: string[];
  now?: number;
}): {
  state: 'UPCOMING' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLATION_REQUESTED' | 'CANCELLED' | 'REFUNDED' | 'EXPIRED' | 'PENDING' | 'FAILED';
  badgeText: string;
  badgeClass: string;
} {
  const current = booking.now ?? Date.now();
  const { bookingEnd } = getBookingTimeRange(booking.booking_date, booking.timeSlots);
  const isPast = current >= bookingEnd.getTime();

  if (booking.payment_status === 'cancelled' || booking.payment_status === 'refunded') {
    // The slot frees up the instant a cancellation is requested (payment_status
    // flips to 'cancelled' immediately), but the refund itself isn't processed
    // until an admin acts on it — cancellation_requested stays true until then,
    // so check it first rather than assuming a non-zero refund_amount means the
    // money has actually moved.
    if (booking.cancellation_requested) {
      return { state: 'CANCELLATION_REQUESTED', badgeText: 'CANCELLATION REQUESTED', badgeClass: 'border-amber-500/20 text-amber-300' };
    }
    if (booking.refund_amount && Number(booking.refund_amount) > 0) {
      return { state: 'REFUNDED', badgeText: 'REFUNDED', badgeClass: 'border-emerald-500/20 text-emerald-400' };
    }
    return { state: 'CANCELLED', badgeText: 'CANCELLED', badgeClass: 'border-red-500/20 text-red-400' };
  }

  if (booking.cancellation_requested) {
    return { state: 'CANCELLATION_REQUESTED', badgeText: 'CANCELLATION REQUESTED', badgeClass: 'border-amber-500/20 text-amber-300' };
  }

  if (booking.checked_in) {
    if (isPast) {
      return { state: 'COMPLETED', badgeText: 'COMPLETED', badgeClass: 'border-blue-500/20 text-blue-400' };
    }
    return { state: 'CHECKED_IN', badgeText: 'CHECKED IN', badgeClass: 'border-emerald-500/20 text-emerald-400' };
  }

  if (isPast) {
    return { state: 'EXPIRED', badgeText: 'EXPIRED', badgeClass: 'border-white/10 text-white/40' };
  }

  if (booking.payment_status === 'pending') {
    return { state: 'PENDING', badgeText: 'PENDING', badgeClass: 'border-yellow-500/20 text-yellow-500' };
  }

  if (booking.payment_status === 'failed') {
    return { state: 'FAILED', badgeText: 'FAILED', badgeClass: 'border-red-500/20 text-red-500' };
  }

  return { state: 'UPCOMING', badgeText: 'UPCOMING', badgeClass: 'border-primary/20 text-primary' };
}

export async function getRefundPolicyConfig(): Promise<{ mode: 'PERCENTAGE' | 'FIXED'; value: number }> {
  try {
    const settings = await dbQuery<{ key: string; value: string }>(
      `SELECT key, value FROM settings WHERE key IN ('refund_fee_mode', 'refund_fee_value')`
    );
    const modeSetting = settings.find((s) => s.key === 'refund_fee_mode')?.value;
    const valueSetting = settings.find((s) => s.key === 'refund_fee_value')?.value;

    const mode: 'PERCENTAGE' | 'FIXED' = modeSetting?.toUpperCase() === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED';
    const parsedVal = valueSetting ? parseFloat(valueSetting) : (mode === 'PERCENTAGE' ? 5 : 300);
    const value = !isNaN(parsedVal) && parsedVal >= 0 ? parsedVal : (mode === 'PERCENTAGE' ? 5 : 300);

    return { mode, value };
  } catch (err) {
    return { mode: 'FIXED', value: 300 };
  }
}

export function formatRefundPolicyText(policy: { mode: 'PERCENTAGE' | 'FIXED'; value: number }, slotCount: number = 1): string {
  if (policy.mode === 'PERCENTAGE') {
    return `${policy.value}% cancellation charge`;
  }
  return slotCount > 1
    ? `₹${policy.value} per slot cancellation charge (₹${policy.value * slotCount} for ${slotCount} slots)`
    : `₹${policy.value} per slot cancellation charge`;
}
