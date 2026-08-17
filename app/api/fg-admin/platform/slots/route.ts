import { NextResponse, type NextRequest } from 'next/server';
import {
  createAdminAuditLog,
  createApprovalRequest,
  getAdminContext,
  getArenaEntryMode,
  listArenas,
  replaceArenaPricing,
  setArenaEntryMode,
} from '@/lib/admin';
import { getArenaPricing, query, queryOne } from '@/lib/domain';
import { readAuthUserId } from '@/lib/session';
import { reportServerError } from '@/lib/error-log';

function parseSlotRows(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(',').map((part) => part.trim());
      const [timeSlot, priceText, dayOfWeekText] = parts;
      const price = Number(priceText);

      if (!timeSlot || Number.isNaN(price)) {
        throw new Error(`Invalid slot row: ${line}`);
      }

      return {
        time_slot: timeSlot,
        price,
        day_of_week: dayOfWeekText ? Number(dayOfWeekText) : null,
      };
    });
}

async function resolveArenaId(request: NextRequest, userId: number | null) {
  const queryArenaId = Number(request.nextUrl.searchParams.get('arena_id') ?? '0') || null;
  const context = await getAdminContext(userId);
  if (!context) return null;

  if (context.role === 'super_admin' || context.role === 'arena_admin') {
    return queryArenaId;
  }

  return context.arenaId;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await readAuthUserId();
    const context = await getAdminContext(userId);

    if (!context || !['super_admin', 'manager', 'arena_admin'].includes(context.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const arenas = (context.role === 'super_admin' || context.role === 'arena_admin') ? await listArenas() : [];
    const arenaId = (await resolveArenaId(request, userId)) ?? ((context.role === 'super_admin' || context.role === 'arena_admin') ? arenas[0]?.id ?? null : null);

    if (!arenaId) {
      return NextResponse.json({ success: true, arenas, slots: [], entryMode: 'open' });
    }

    const slots = await getArenaPricing(arenaId);
    const entryMode = await getArenaEntryMode(arenaId);
    const holidays = await query<{ id: number; date: string; reason: string | null }>(
      `SELECT id, date, reason FROM arena_holidays WHERE arena_id = ? ORDER BY date ASC`,
      [arenaId]
    );
    // admin_slot_blocks.booking_date is TEXT, not DATE — Postgres has no
    // implicit text->date cast, so comparing it directly against
    // CURRENT_DATE (a date) threw on every single call here, unconditionally,
    // for every arena. This was the actual root cause of "add slot does
    // nothing" and "current slots never show": the POST insert succeeded,
    // but every subsequent GET refresh (including the one POST triggers)
    // crashed before ever reaching this response.
    const blockedSlots = await query<{ id: number; booking_date: string; time_slot: string; reason: string | null }>(
      `SELECT id, booking_date, time_slot, reason FROM admin_slot_blocks
        WHERE arena_id = ? AND booking_date >= CURRENT_DATE::text
        ORDER BY booking_date ASC, time_slot ASC`,
      [arenaId]
    );

    return NextResponse.json({ success: true, arenas, arenaId, slots, entryMode, holidays, blockedSlots });
  } catch (err: any) {
    reportServerError(err, { route: 'fg-admin/platform/slots', action: 'GET' });
    return NextResponse.json({ success: false, message: 'Failed to load slot data. Please try again.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const isJson = request.headers.get('content-type')?.includes('application/json');
  let action = 'slot_template';
  try {
  const form = isJson ? await request.json() : Object.fromEntries((await request.formData()).entries());
  action = String((form as Record<string, string>).action ?? 'slot_template');
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || !['super_admin', 'manager', 'arena_admin'].includes(context.role)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
  }

  const arenaId = (context.role === 'super_admin' || context.role === 'arena_admin')
    ? Number((form as Record<string, string>).arena_id ?? '0') || null
    : context.arenaId;

  if (!arenaId) {
    return NextResponse.json({ success: false, message: 'Arena is required.' }, { status: 400 });
  }

  if (action === 'entry_mode') {
    const mode = String((form as Record<string, string>).mode ?? 'open') as 'open' | 'blocked' | 'free';
    const notes = String((form as Record<string, string>).notes ?? '');

    if ((context.role === 'super_admin' || context.role === 'arena_admin')) {
      await setArenaEntryMode(arenaId, mode);
      await createAdminAuditLog({
        action: 'entry_mode_changed',
        approvedBy: context.id,
        arenaId,
        newValue: { mode, notes },
      });
    } else {
      await createApprovalRequest({
        arenaId,
        requestedBy: context.id,
        requestType: 'entry_mode_update',
        payload: { mode },
        notes,
      });
    }
  }

  if (action === 'slot_template') {
    const slotsText = String((form as Record<string, string>).slots_text ?? '');
    if (!slotsText.trim()) {
      return NextResponse.json({ success: false, message: 'Slot template is required.' }, { status: 400 });
    }
    const slots = parseSlotRows(slotsText);
    const notes = String((form as Record<string, string>).notes ?? '');

    if ((context.role === 'super_admin' || context.role === 'arena_admin')) {
      await replaceArenaPricing(arenaId, slots);
      await createAdminAuditLog({
        action: 'slot_template_replaced',
        approvedBy: context.id,
        arenaId,
        newValue: { slots, notes },
      });
    } else {
      await createApprovalRequest({
        arenaId,
        requestedBy: context.id,
        requestType: 'slot_template_update',
        payload: { slots },
        notes,
      });
    }
  }

  if (action === 'image_update') {
    const coverImage = String((form as Record<string, string>).cover_image ?? '');
    const logoUrl = String((form as Record<string, string>).logo_url ?? '');
    const notes = String((form as Record<string, string>).notes ?? 'Update arena images');

    if ((context.role === 'super_admin' || context.role === 'arena_admin')) {
      const updates = [];
      const values = [];
      if (coverImage) { updates.push('cover_image = ?'); values.push(coverImage); }
      if (logoUrl) { updates.push('logo_url = ?'); values.push(logoUrl); }
      
      if (updates?.length > 0) {
        values.push(arenaId);
        await query(`UPDATE arenas SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, values);
        await createAdminAuditLog({
          action: 'image_updated',
          approvedBy: context.id,
          arenaId,
          newValue: { cover_image: coverImage, logo_url: logoUrl, notes },
        });
      }
    } else {
      await createApprovalRequest({
        arenaId,
        requestedBy: context.id,
        requestType: 'image_update',
        payload: { arena_id: arenaId, cover_image: coverImage, logo_url: logoUrl },
        notes,
      });
    }
  }

  if (action === 'timing_update') {
    const timeSlot = String((form as Record<string, string>).time_slot ?? '');
    const startTime = String((form as Record<string, string>).start_time ?? '');
    const endTime = String((form as Record<string, string>).end_time ?? '');
    const notes = String((form as Record<string, string>).notes ?? '');

    if (!timeSlot || !startTime || !endTime) {
      return NextResponse.json({ success: false, message: 'Time slot, start and end times are required.' }, { status: 400 });
    }

    if ((context.role === 'super_admin' || context.role === 'arena_admin')) {
      await query(
        `INSERT INTO slot_timings (arena_id, time_slot, start_time, end_time, created_at, updated_at)
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [arenaId, timeSlot, startTime, endTime]
      );
      await createAdminAuditLog({
        action: 'timing_added',
        approvedBy: context.id,
        arenaId,
        newValue: { timeSlot, startTime, endTime, notes },
      });
    } else {
      await createApprovalRequest({
        arenaId,
        requestedBy: context.id,
        requestType: 'timing_update',
        payload: { arena_id: arenaId, time_slot: timeSlot, start_time: startTime, end_time: endTime },
        notes,
      });
    }
  }

  if (action === 'slot_add') {
    const timeSlot = String((form as Record<string, string>).time_slot ?? '').trim();
    const price = Number((form as Record<string, string>).price);
    const dayOfWeekRaw = String((form as Record<string, string>).day_of_week ?? '');
    const dayOfWeek = dayOfWeekRaw === '' ? null : Number(dayOfWeekRaw);
    const notes = String((form as Record<string, string>).notes ?? 'Add slot');

    if (!timeSlot || Number.isNaN(price) || price < 0) {
      return NextResponse.json({ success: false, message: 'A valid time slot and price are required.' }, { status: 400 });
    }

    if ((context.role === 'super_admin' || context.role === 'arena_admin')) {
      await query(
        `INSERT INTO pricings (arena_id, time_slot, price, day_of_week, created_at, updated_at)
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [arenaId, timeSlot, price, dayOfWeek]
      );
      await createAdminAuditLog({
        action: 'slot_added',
        approvedBy: context.id,
        arenaId,
        newValue: { timeSlot, price, dayOfWeek, notes },
      });
    } else {
      await createApprovalRequest({
        arenaId,
        requestedBy: context.id,
        requestType: 'slot_add',
        payload: { time_slot: timeSlot, price, day_of_week: dayOfWeek },
        notes,
      });
    }
  }

  if (action === 'slot_edit') {
    const slotId = Number((form as Record<string, string>).slot_id);
    const price = Number((form as Record<string, string>).price);
    const dayOfWeekRaw = String((form as Record<string, string>).day_of_week ?? '');
    const dayOfWeek = dayOfWeekRaw === '' ? null : Number(dayOfWeekRaw);
    const notes = String((form as Record<string, string>).notes ?? 'Edit slot');

    if (!slotId || Number.isNaN(price) || price < 0) {
      return NextResponse.json({ success: false, message: 'A valid slot and price are required.' }, { status: 400 });
    }

    if ((context.role === 'super_admin' || context.role === 'arena_admin')) {
      await query(
        `UPDATE pricings SET price = ?, day_of_week = ?, updated_at = NOW() WHERE id = ? AND arena_id = ?`,
        [price, dayOfWeek, slotId, arenaId]
      );
      await createAdminAuditLog({
        action: 'slot_edited',
        approvedBy: context.id,
        arenaId,
        newValue: { slotId, price, dayOfWeek, notes },
      });
    } else {
      await createApprovalRequest({
        arenaId,
        requestedBy: context.id,
        requestType: 'slot_edit',
        payload: { slot_id: slotId, price, day_of_week: dayOfWeek },
        notes,
      });
    }
  }

  if (action === 'slot_delete') {
    const slotId = Number((form as Record<string, string>).slot_id);
    const notes = String((form as Record<string, string>).notes ?? 'Delete slot');

    if (!slotId) {
      return NextResponse.json({ success: false, message: 'A valid slot is required.' }, { status: 400 });
    }

    if ((context.role === 'super_admin' || context.role === 'arena_admin')) {
      await query(`DELETE FROM pricings WHERE id = ? AND arena_id = ?`, [slotId, arenaId]);
      await createAdminAuditLog({
        action: 'slot_deleted',
        approvedBy: context.id,
        arenaId,
        newValue: { slotId, notes },
      });
    } else {
      await createApprovalRequest({
        arenaId,
        requestedBy: context.id,
        requestType: 'slot_delete',
        payload: { slot_id: slotId },
        notes,
      });
    }
  }

  if (action === 'holiday_add') {
    const date = String((form as Record<string, string>).date ?? '');
    const reason = String((form as Record<string, string>).reason ?? '') || null;
    const notes = String((form as Record<string, string>).notes ?? reason ?? 'Add holiday');

    if (!date) {
      return NextResponse.json({ success: false, message: 'A date is required.' }, { status: 400 });
    }

    if ((context.role === 'super_admin' || context.role === 'arena_admin')) {
      await query(
        `INSERT INTO arena_holidays (arena_id, date, reason, created_by, created_at)
         VALUES (?, ?, ?, ?, NOW())
         ON CONFLICT (arena_id, date) DO UPDATE SET reason = EXCLUDED.reason`,
        [arenaId, date, reason, context.id]
      );
      await createAdminAuditLog({
        action: 'holiday_added',
        approvedBy: context.id,
        arenaId,
        newValue: { date, reason },
      });
    } else {
      await createApprovalRequest({
        arenaId,
        requestedBy: context.id,
        requestType: 'holiday_add',
        payload: { date, reason },
        notes,
      });
    }
  }

  if (action === 'holiday_delete') {
    const holidayId = Number((form as Record<string, string>).holiday_id);
    const notes = String((form as Record<string, string>).notes ?? 'Delete holiday');

    if (!holidayId) {
      return NextResponse.json({ success: false, message: 'A valid holiday is required.' }, { status: 400 });
    }

    if ((context.role === 'super_admin' || context.role === 'arena_admin')) {
      await query(`DELETE FROM arena_holidays WHERE id = ? AND arena_id = ?`, [holidayId, arenaId]);
      await createAdminAuditLog({
        action: 'holiday_deleted',
        approvedBy: context.id,
        arenaId,
        newValue: { holidayId, notes },
      });
    } else {
      await createApprovalRequest({
        arenaId,
        requestedBy: context.id,
        requestType: 'holiday_delete',
        payload: { holiday_id: holidayId },
        notes,
      });
    }
  }

  if (action === 'block_add') {
    const bookingDate = String((form as Record<string, string>).booking_date ?? '');
    const timeSlot = String((form as Record<string, string>).time_slot ?? '');
    const reason = String((form as Record<string, string>).reason ?? '') || 'Blocked';

    if (!bookingDate || !timeSlot) {
      return NextResponse.json({ success: false, message: 'A date and time slot are required.' }, { status: 400 });
    }

    if ((context.role === 'super_admin' || context.role === 'arena_admin')) {
      await query(
        `INSERT INTO admin_slot_blocks (super_admin_id, arena_id, booking_date, time_slot, reason, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'confirmed', NOW(), NOW())`,
        [context.id, arenaId, bookingDate, timeSlot, reason]
      );
      await createAdminAuditLog({
        action: 'slot_blocked',
        approvedBy: context.id,
        arenaId,
        newValue: { bookingDate, timeSlot, reason },
      });
    } else {
      await createApprovalRequest({
        arenaId,
        requestedBy: context.id,
        requestType: 'BLOCK_SLOT_REQUEST',
        payload: { bookingDate, slots: [timeSlot], reason },
        notes: reason,
      });
    }
  }

  if (action === 'block_delete') {
    const blockId = Number((form as Record<string, string>).block_id);

    if (!blockId) {
      return NextResponse.json({ success: false, message: 'A valid block is required.' }, { status: 400 });
    }

    // Deleting a block is always a direct, immediate action for whichever
    // admin owns it (super_admin globally, arena_admin for their own
    // arena) — unlike creating one, unblocking doesn't need approval since
    // it only ever removes a restriction, never adds one.
    if ((context.role === 'super_admin' || context.role === 'arena_admin')) {
      await query(`DELETE FROM admin_slot_blocks WHERE id = ? AND arena_id = ?`, [blockId, arenaId]);
    } else {
      const block = await queryOne<{ id: number }>(
        `DELETE FROM admin_slot_blocks WHERE id = ? AND arena_id = ? RETURNING id`,
        [blockId, arenaId]
      );
      if (!block) {
        return NextResponse.json({ success: false, message: 'Block not found for your arena.' }, { status: 404 });
      }
    }
    await createAdminAuditLog({
      action: 'slot_unblocked',
      approvedBy: context.id,
      arenaId,
      newValue: { blockId },
    });
  }

  if (!isJson) {
    return NextResponse.redirect(new URL('/fg-admin/platform/slots?updated=1', request.url));
  }

  return NextResponse.json({ success: true });
  } catch (err: any) {
    // A duplicate slot (same time range already exists for that day, or as
    // an "every day" default) hits the pricings unique index and throws
    // rather than failing gracefully — without this catch, any DB error
    // here crashed as a raw HTML 500 page, which the client can't parse as
    // JSON and reports as a generic "network error".
    if (err?.code === '23505') {
      return NextResponse.json(
        { success: false, message: 'That exact time slot already exists for this arena/day. Edit the existing one instead of adding a duplicate.' },
        { status: 409 }
      );
    }
    reportServerError(err, { route: 'fg-admin/platform/slots', action });
    return NextResponse.json({ success: false, message: 'Something went wrong saving that change. Please try again.' }, { status: 500 });
  }
}
