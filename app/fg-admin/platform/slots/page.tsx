import { readAuthUserId } from '@/lib/session';
import { getAdminContext, getArenaEntryMode, listArenas } from '@/lib/admin';
import { getArenaById, query } from '@/lib/domain';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import SlotManagementClient from '@/components/SlotManagementClient';
import ArenaPickerForm from '@/components/ArenaPickerForm';

const DAY_NAMES: Record<number, string> = {
  0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday',
};

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminSlotsPage({ searchParams }: Props) {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || !['super_admin', 'arena_admin', 'manager'].includes(context.role)) {
    redirect('/fg-admin/platform/dashboard');
  }

  const params = await searchParams;
  const selectedArenaId = (context.role === 'super_admin' || context.role === 'arena_admin')
    ? Number(typeof params.arena_id === 'string' ? params.arena_id : '') || null
    : context.arenaId;

  const arenas = (context.role === 'super_admin' || context.role === 'arena_admin') ? await listArenas() : [];
  const arenaId = selectedArenaId ?? (arenas[0]?.id ?? null);
  const arena = arenaId ? await getArenaById(arenaId) : null;
  const entryMode = arenaId ? await getArenaEntryMode(arenaId) : 'open';
  const timings = arenaId
    ? await query<{ id: number; time_slot: string; start_time: string; end_time: string; day_of_week: number | null }>(
        `SELECT id, time_slot, start_time, end_time, day_of_week
           FROM slot_timings
          WHERE arena_id = ?
          ORDER BY start_time ASC`,
        [arenaId]
      )
    : [];

  return (
    <div className="max-w-7xl mx-auto px-6 py-20 space-y-12">
      <div>
        <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
          Slot <span className="text-primary text-stroke">Management</span>
        </h1>
        <p className="label-classic !ml-0">Super admins can apply changes, arena admins submit approval requests</p>
      </div>

      {(context.role === 'super_admin' || context.role === 'arena_admin') && (arenas?.length || 0) > 0 && (
        <ArenaPickerForm arenas={arenas} selectedArenaId={arenaId} />
      )}

      {arenaId ? (
        <>
          {(context.role === 'super_admin' || context.role === 'arena_admin') && (
            <div className="flex justify-end">
              <Link href="/fg-admin/platform/approvals" className="text-primary text-[10px] font-bold uppercase tracking-widest">
                Review approvals →
              </Link>
            </div>
          )}

          <SlotManagementClient arenaId={arenaId} isSuperAdmin={(context.role === 'super_admin' || context.role === 'arena_admin')} />

          <form action="/api/fg-admin/platform/slots" method="POST" className="glass-card space-y-6 max-w-xl">
            <input type="hidden" name="action" value="entry_mode" />
            <input type="hidden" name="arena_id" value={arenaId} />
            <h2 className="text-2xl font-black uppercase italic">Entry Mode</h2>
            <p className="label-classic !ml-0">Current: {entryMode}</p>
            <select name="mode" className="input-field" defaultValue={entryMode}>
              <option value="open">Open</option>
              <option value="blocked">Blocked</option>
              <option value="free">Free Entry</option>
            </select>
            <textarea name="notes" rows={4} className="input-field" placeholder="Notes" />
            <button className="btn-primary" type="submit">
              {(context.role === 'super_admin' || context.role === 'arena_admin') ? 'Apply Mode' : 'Request Mode Change'}
            </button>
          </form>
        </>
      ) : (
        <div className="glass-card text-center py-20">
          <p className="text-white/20 font-black uppercase tracking-widest italic">Create an arena first to manage slots.</p>
        </div>
      )}

      {arenaId && (
        <div className="grid lg:grid-cols-2 gap-8">
          <form action="/api/fg-admin/platform/slots" method="POST" className="glass-card space-y-6">
            <input type="hidden" name="action" value="timing_update" />
            <input type="hidden" name="arena_id" value={arenaId} />
            <h2 className="text-2xl font-black uppercase italic">Arena Timings</h2>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
              Define operating hours (e.g. 06:00 AM to 11:00 PM)
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="label-classic">Slot Name</label>
                <input name="time_slot" className="input-field" placeholder="e.g. Morning Session" required />
              </div>
              <div className="space-y-2">
                <label className="label-classic">Day of Week</label>
                <select name="day_of_week" className="input-field">
                  <option value="">All Days</option>
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                  <option value="0">Sunday</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="label-classic">Start Time</label>
                <input name="start_time" type="time" className="input-field" required />
              </div>
              <div className="space-y-2">
                <label className="label-classic">End Time</label>
                <input name="end_time" type="time" className="input-field" required />
              </div>
            </div>
            <textarea name="notes" rows={2} className="input-field" placeholder="Notes" />
            <button className="btn-primary" type="submit">
              {(context.role === 'super_admin' || context.role === 'arena_admin') ? 'Add Timing' : 'Request Timing'}
            </button>
          </form>

          <div className="glass-card">
            <h2 className="text-2xl font-black uppercase italic mb-6">Current Timings</h2>
            {timings.length === 0 ? (
              <p className="text-white/30 text-xs uppercase font-bold tracking-widest">No timings configured for {arena?.name || 'this arena'} yet.</p>
            ) : (
              <div className="space-y-3">
                {timings.map((t) => (
                  <div key={t.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="font-black text-white italic text-sm">{t.time_slot}</div>
                      <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                        {t.day_of_week === null ? 'All Days' : DAY_NAMES[t.day_of_week] ?? 'Unknown'}
                      </div>
                    </div>
                    <div className="text-primary font-black text-sm">{t.start_time}–{t.end_time}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
