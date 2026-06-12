import { readAuthUserId } from '@/lib/session';
import { getAdminContext, getArenaEntryMode, listArenas } from '@/lib/admin';
import { getArenaPricing, getArenaById } from '@/lib/domain';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminSlotsPage({ searchParams }: Props) {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || !['super_admin', 'arena_admin'].includes(context.role)) {
    redirect('/fg-admin/platform/dashboard');
  }

  const params = await searchParams;
  const selectedArenaId = context.role === 'super_admin'
    ? Number(typeof params.arena_id === 'string' ? params.arena_id : '') || null
    : context.arenaId;

  const arenas = context.role === 'super_admin' ? await listArenas() : [];
  const arenaId = selectedArenaId ?? (arenas[0]?.id ?? null);
  const arena = arenaId ? await getArenaById(arenaId) : null;
  const slots = arenaId ? await getArenaPricing(arenaId) : [];
  const entryMode = arenaId ? await getArenaEntryMode(arenaId) : 'open';

  return (
    <div className="max-w-7xl mx-auto px-6 py-20 space-y-12">
      <div>
        <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
          Slot <span className="text-primary text-stroke">Management</span>
        </h1>
        <p className="label-classic !ml-0">Super admins can apply changes, arena admins submit approval requests</p>
      </div>

      {context.role === 'super_admin' && (arenas?.length || 0) > 0 && (
        <form method="GET" className="glass-card flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <label className="label-classic">Arena</label>
            <select name="arena_id" defaultValue={arenaId ?? undefined} className="input-field">
              {(arenas || []).map((arenaOption) => (
                <option key={arenaOption.id} value={arenaOption.id}>{arenaOption.name}</option>
              ))}
            </select>
          </div>
          <button className="btn-primary" type="submit">Load Arena</button>
        </form>
      )}

      {arenaId ? (
        <div className="grid lg:grid-cols-2 gap-8">
          <form action="/api/fg-admin/platform/slots" method="POST" className="glass-card space-y-6">
            <input type="hidden" name="action" value="slot_template" />
            <input type="hidden" name="arena_id" value={arenaId} />
            <h2 className="text-2xl font-black uppercase italic">Slot Template</h2>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
              One line per slot: <code>18:00-19:00,500</code>
            </p>
            <textarea name="slots_text" rows={8} className="input-field" placeholder="18:00-19:00,500" />
            <textarea name="notes" rows={2} className="input-field" placeholder="Notes" />
            <button className="btn-primary" type="submit">
              {context.role === 'super_admin' ? 'Apply Slots' : 'Request Slot Change'}
            </button>
          </form>

          <form action="/api/fg-admin/platform/slots" method="POST" className="glass-card space-y-6">
            <input type="hidden" name="action" value="entry_mode" />
            <input type="hidden" name="arena_id" value={arenaId} />
            <h2 className="text-2xl font-black uppercase italic">Entry Mode</h2>
            <select name="mode" className="input-field" defaultValue={entryMode}>
              <option value="open">Open</option>
              <option value="blocked">Blocked</option>
              <option value="free">Free Entry</option>
            </select>
            <textarea name="notes" rows={4} className="input-field" placeholder="Notes" />
            <button className="btn-primary" type="submit">
              {context.role === 'super_admin' ? 'Apply Mode' : 'Request Mode Change'}
            </button>
          </form>
        </div>
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
              {context.role === 'super_admin' ? 'Add Timing' : 'Request Timing'}
            </button>
          </form>

          <div className="glass-card">
            <h2 className="text-2xl font-black uppercase italic mb-6">Current Timings</h2>
            <div className="space-y-4">
              <p className="text-white/30 text-xs uppercase font-bold tracking-widest">Timings configured for {arena?.name || 'this arena'} will appear here.</p>
            </div>
          </div>
        </div>
      )}

      {arena && (
        <div className="glass-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black uppercase italic">{arena.name}</h2>
            {context.role === 'super_admin' && (
              <Link href="/fg-admin/platform/approvals" className="text-primary text-[10px] font-bold uppercase tracking-widest">
                Review approvals →
              </Link>
            )}
          </div>

          <p className="label-classic !ml-0 mb-4">Current entry mode: {entryMode}</p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(slots || []).map((slot) => (
              <div key={slot.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                <div className="font-black uppercase italic">{slot.time_slot}</div>
                <div className="text-primary font-black">₹{Number(slot.price)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
