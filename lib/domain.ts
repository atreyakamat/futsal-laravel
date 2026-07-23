import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query as dbQuery, queryOne, transaction } from '@/lib/db';
import type { ArenaSummary, BookingRow, PricingRow, SlotLockRow } from '@/lib/types';

// Export query for use in other modules
export const query = dbQuery;
export { queryOne, transaction } from '@/lib/db';

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

export async function expirePendingBookings() {
  await dbQuery(
    `UPDATE bookings 
        SET payment_status = 'failed', updated_at = NOW() 
      WHERE payment_status = 'pending' 
        AND created_at < NOW() - INTERVAL '15 minutes'`
  );
}

export async function getBookingsByRef(bookingRef: string) {
  return dbQuery<BookingRow>('SELECT * FROM bookings WHERE booking_ref = ? ORDER BY time_slot ASC', [bookingRef]);
}

export async function getBookingsForUser(userId: number) {
  return dbQuery<BookingRow>(
    `SELECT * FROM bookings
      WHERE user_id = ?
        AND payment_status IN ('confirmed', 'pending')
      ORDER BY created_at DESC`,
    [userId]
  );
}

export async function getBookingByTicket(ticketNumber: string) {
  return queryOne<BookingRow>('SELECT * FROM bookings WHERE ticket_number = ? LIMIT 1', [ticketNumber]);
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
}) {
  await expirePendingBookings();
  const bookingRef = `REF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const bookings = await getArenaPricing(params.arenaId);
  const priceBySlot = new Map(bookings.map((row) => [row.time_slot, Number(row.price)]));
  const created: Array<{ booking_ref: string; ticket_number: string; time_slot: string; amount: number }> = [];
  let effectiveUserId = params.userId;

  await transaction(async (connection) => {
    // JIT User Creation: If no userId, find or create
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
           VALUES (?, ?, ?, 'customer', NOW(), NOW())
           RETURNING id`,
          [params.customerName, params.customerEmail || `user-${crypto.randomUUID().slice(0, 8)}@agnelarena.com`, params.customerMobile]
        );
        effectiveUserId = (newUserRows as any[])[0].id;
      }
    }

    for (const slot of params.slots) {
      const slotPrice = params.freeBooking ? 0 : (priceBySlot.get(slot) ?? 500);

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

      await connection.execute(
        `INSERT INTO bookings (
          ticket_number, booking_ref, arena_id, user_id, booking_date, time_slot,
          customer_name, customer_mobile, customer_email, amount, payment_status,
          payment_method, notes, checked_in, is_free_booking, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, FALSE, ?, NOW(), NOW())`,
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
          params.freeBooking ? 'confirmed' : 'pending',
          params.freeBooking ? 'free' : 'online',
          params.freeBooking ? true : false,
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

  if (bookings && bookings?.length === 0) {
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

export async function getSetting(key: string) {
  return queryOne<{ key: string; value: string | null }>('SELECT "key", value FROM settings WHERE "key" = ? LIMIT 1', [key]);
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

export async function getSecurityBookings(ticketNumber: string) {
  return dbQuery<BookingRow>(`SELECT * FROM bookings WHERE ticket_number = ? ORDER BY booking_date DESC`, [ticketNumber]);
}

export async function confirmEntryByTicket(ticketNumber: string, checkedInByUserId: number | null) {
  const bookings = await getSecurityBookings(ticketNumber);

  if (bookings && bookings?.length === 0) {
    return { success: false, message: 'Ticket not found.' };
  }

  if (bookings[0]?.checked_in) {
    return { success: false, message: 'Already checked in.' };
  }

  await query(
    `UPDATE bookings
        SET checked_in = TRUE, checked_in_at = NOW(), checked_in_by = ?, updated_at = NOW()
      WHERE ticket_number = ?`,
    [checkedInByUserId, ticketNumber]
  );

  return { success: true, message: 'Entry confirmed.' };
}

export async function findUserById(id: number) {
  return queryOne<{ id: number; name: string; email: string; customer_mobile: string; role: string }>('SELECT id, name, email, customer_mobile, role FROM users WHERE id = ? LIMIT 1', [id]);
}
