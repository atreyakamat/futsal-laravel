import { NextResponse, type NextRequest } from 'next/server';
import { getArenaById, getArenaPricingForDate, getBookedSlots, getLockedSlots, getMyLockedSlots, query } from '@/lib/domain';
import { getCookieValueFromRequest, getWritableSessionId, persistSessionCookie, SESSION_COOKIE } from '@/lib/session';

export async function GET(request: NextRequest) {
  const arenaId = Number(request.nextUrl.searchParams.get('arena_id'));
  const date = request.nextUrl.searchParams.get('date');

  if (!arenaId || !date) {
    return NextResponse.json({ success: false, message: 'arena_id and date are required.' }, { status: 400 });
  }

  const arena = await getArenaById(arenaId);
  const bookingDate = date;
  const sessionId = getCookieValueFromRequest(request, SESSION_COOKIE) ?? getWritableSessionId(request);

  const holiday = await query<{ reason: string | null }>(
    `SELECT reason FROM arena_holidays WHERE arena_id = ? AND date = ? LIMIT 1`,
    [arenaId, bookingDate]
  );

  if (holiday.length > 0) {
    const response = NextResponse.json({
      success: true,
      arena: arena?.name ?? null,
      date: bookingDate,
      holiday: true,
      closedReason: holiday[0].reason || 'Closed',
      slots: [],
    });
    if (!request.headers.get('cookie')?.includes(SESSION_COOKIE)) {
      persistSessionCookie(response, sessionId);
    }
    return response;
  }

  // Date-aware: resolves exactly one price per time_slot for this date,
  // preferring a day-specific override over the "every day" default.
  const pricing = await getArenaPricingForDate(arenaId, bookingDate);
  const bookedSlots = await getBookedSlots(arenaId, bookingDate);
  const lockedByOthers = await getLockedSlots(arenaId, bookingDate, sessionId);
  const lockedByMe = await getMyLockedSlots(arenaId, bookingDate, sessionId);
  const blockedSlots = (
    await query<{ time_slot: string }>(
      `SELECT time_slot FROM admin_slot_blocks WHERE arena_id = ? AND booking_date = ?`,
      [arenaId, bookingDate]
    )
  ).map((r) => r.time_slot);

  // Parse day of the week for the booking date (local time)
  const dateObj = new Date(bookingDate + 'T00:00:00');
  const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isAssagao = arena?.slug === 'aiem-assagao';

  const slots = pricing.map((price) => {
    let status = bookedSlots.includes(price.time_slot)
      ? 'booked'
      : blockedSlots.includes(price.time_slot)
        ? 'blocked'
        : lockedByOthers.includes(price.time_slot)
          ? 'locked'
          : lockedByMe.includes(price.time_slot)
            ? 'selected'
            : 'available';

    // Override status to 'booked' for 3 PM - 5 PM on weekdays for AIEM Assagao (reserved for college students)
    // TODO: migrate this arena's 15:00-16:00/16:00-17:00 slots to real
    // weekend-only day_of_week rows via the slot management UI, then
    // remove this hardcode — left in place until that reconfiguration is
    // done so this doesn't silently open those slots up on weekdays.
    if (isAssagao && isWeekday && (price.time_slot === '15:00-16:00' || price.time_slot === '16:00-17:00')) {
      status = 'booked';
    }

    return {
      time_slot: price.time_slot,
      price: Number(price.price),
      status,
    };
  });

  const response = NextResponse.json({
    success: true,
    arena: arena?.name ?? null,
    date: bookingDate,
    holiday: false,
    slots,
  });

  if (!request.headers.get('cookie')?.includes(SESSION_COOKIE)) {
    persistSessionCookie(response, sessionId);
  }

  return response;
}