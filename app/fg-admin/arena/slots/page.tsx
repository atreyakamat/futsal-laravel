import { readAuthUserId, readAuthRole } from '@/lib/session';
import { getAdminContext, getArenaEntryMode } from '@/lib/admin';
import { getArenaById, getArenaPricing, query } from '@/lib/domain';
import { redirect } from 'next/navigation';
import ArenaAdminSlotsClient from './ArenaSlotClient';

export const dynamic = 'force-dynamic';

export default async function ArenaAdminSlotsPage() {
  const userId = await readAuthUserId();
  const role = await readAuthRole();
  const context = await getAdminContext(userId);

  if (!context || role !== 'arena_admin' || !context.arenaId) {
    redirect('/fg-admin/login');
  }

  const arenaId = context.arenaId;
  const arena = await getArenaById(arenaId);
  const entryMode = await getArenaEntryMode(arenaId);

  const [slots, timings, approvalRequests] = await Promise.all([
    getArenaPricing(arenaId),
    query<{ id: number; time_slot: string; start_time: string; end_time: string; day_of_week: number | null }>(
      `SELECT id, time_slot, start_time, end_time, day_of_week
         FROM slot_timings
        WHERE arena_id = ?
        ORDER BY start_time ASC`,
      [arenaId]
    ),
    query<{
      id: number;
      request_type: string;
      arena_id: number | null;
      requested_by: number | null;
      status: string;
      notes: string | null;
      payload_json: string | null;
      created_at: string;
    }>(
      `SELECT id, request_type, arena_id, requested_by, status, notes, payload_json, created_at
         FROM approval_requests
        WHERE arena_id = ?
        ORDER BY created_at DESC
        LIMIT 50`,
      [arenaId]
    ),
  ]);

  const freeBookings = approvalRequests
    .filter((req: any) => req.request_type === 'FREE_BOOKING_REQUEST')
    .map((fb: any) => {
      const payload = fb.payload_json ? JSON.parse(fb.payload_json) : {};
      return {
        id: fb.id,
        booking_date: payload.bookingDate || '',
        time_slot: payload.slots ? payload.slots.join(', ') : '',
        number_of_rounds: 1,
        status: fb.status,
        rejection_reason: fb.decision_reason ?? null,
      };
    });

  return (
    <ArenaAdminSlotsClient
      arenaId={arenaId}
      arenaName={arena?.name ?? `Arena #${arenaId}`}
      slots={slots as any}
      timings={timings as any}
      approvalRequests={approvalRequests as any}
      freeBookings={freeBookings as any}
      entryMode={entryMode}
    />
  );
}
