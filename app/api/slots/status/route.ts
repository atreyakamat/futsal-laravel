import { NextResponse, type NextRequest } from 'next/server';
import { getArenaById, getArenaPricing, getBookedSlots, getLockedSlots, getMyLockedSlots } from '@/lib/domain';
import { getCookieValueFromRequest, getWritableSessionId, persistSessionCookie, SESSION_COOKIE } from '@/lib/session';

export async function GET(request: NextRequest) {
  const arenaId = Number(request.nextUrl.searchParams.get('arena_id'));
  const date = request.nextUrl.searchParams.get('date');

  if (!arenaId || !date) {
    return NextResponse.json({ success: false, message: 'arena_id and date are required.' }, { status: 400 });
  }

  const arena = await getArenaById(arenaId);
  const pricing = await getArenaPricing(arenaId);
  const bookingDate = date;
  const sessionId = getCookieValueFromRequest(request, SESSION_COOKIE) ?? getWritableSessionId(request);
  const bookedSlots = await getBookedSlots(arenaId, bookingDate);
  const lockedByOthers = await getLockedSlots(arenaId, bookingDate, sessionId);
  const lockedByMe = await getMyLockedSlots(arenaId, bookingDate, sessionId);

  const slots = pricing.map((price) => {
    const status = bookedSlots.includes(price.time_slot)
      ? 'booked'
      : lockedByOthers.includes(price.time_slot)
        ? 'locked'
        : lockedByMe.includes(price.time_slot)
          ? 'selected'
          : 'available';

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
    slots,
  });

  if (!request.headers.get('cookie')?.includes(SESSION_COOKIE)) {
    persistSessionCookie(response, sessionId);
  }

  return response;
}