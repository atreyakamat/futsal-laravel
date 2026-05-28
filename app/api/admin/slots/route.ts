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
import { getArenaPricing } from '@/lib/domain';
import { readAuthUserId } from '@/lib/session';

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

  if (context.role === 'super_admin') {
    return queryArenaId;
  }

  return context.arenaId;
}

export async function GET(request: NextRequest) {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || !['super_admin', 'admin'].includes(context.role)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
  }

  const arenas = context.role === 'super_admin' ? await listArenas() : [];
  const arenaId = (await resolveArenaId(request, userId)) ?? (context.role === 'super_admin' ? arenas[0]?.id ?? null : null);

  if (!arenaId) {
    return NextResponse.json({ success: true, arenas, slots: [], entryMode: 'open' });
  }

  const slots = await getArenaPricing(arenaId);
  const entryMode = await getArenaEntryMode(arenaId);

  return NextResponse.json({ success: true, arenas, arenaId, slots, entryMode });
}

export async function POST(request: Request) {
  const isJson = request.headers.get('content-type')?.includes('application/json');
  const form = isJson ? await request.json() : Object.fromEntries((await request.formData()).entries());
  const action = String((form as Record<string, string>).action ?? 'slot_template');
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || !['super_admin', 'admin'].includes(context.role)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
  }

  const arenaId = context.role === 'super_admin'
    ? Number((form as Record<string, string>).arena_id ?? '0') || null
    : context.arenaId;

  if (!arenaId) {
    return NextResponse.json({ success: false, message: 'Arena is required.' }, { status: 400 });
  }

  if (action === 'entry_mode') {
    const mode = String((form as Record<string, string>).mode ?? 'open') as 'open' | 'blocked' | 'free';
    const notes = String((form as Record<string, string>).notes ?? '');

    if (context.role === 'super_admin') {
      await setArenaEntryMode(arenaId, mode);
      await createAdminAuditLog({
        action: 'entry_mode_changed',
        actorUserId: context.id,
        arenaId,
        entityType: 'arena',
        entityId: arenaId,
        afterData: { mode, notes },
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

    if (context.role === 'super_admin') {
      await replaceArenaPricing(arenaId, slots);
      await createAdminAuditLog({
        action: 'slot_template_replaced',
        actorUserId: context.id,
        arenaId,
        entityType: 'arena',
        entityId: arenaId,
        afterData: { slots, notes },
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

  if (!isJson) {
    return NextResponse.redirect(new URL('/admin/slots?updated=1', request.url));
  }

  return NextResponse.json({ success: true });
}
