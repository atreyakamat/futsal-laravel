import { readAuthUserId } from '@/lib/session';
import { getAdminContext, getArenaEntryMode, listArenas } from '@/lib/admin';
import { getArenaPricing, getArenaById } from '@/lib/domain';
import { redirect } from 'next/navigation';
import Link from 'next/link';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminSlotsPage({ searchParams }: Props) {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || (context.role !== 'super_admin' && context.role !== 'admin')) {
    redirect('/admin/dashboard');
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
        <p className="label-classic !ml-0">Initialize slots or request changes for approval</p>
      </div>

      {context.role === 'super_admin' && arenas.length > 0 && (
        <form method="GET" className="glass-card flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <label className="label-classic">Arena</label>
            <select name="arena_id" defaultValue={arenaId ?? undefined} className="input-field">
              {arenas.map((arenaOption) => (
                <option key={arenaOption.id} value={arenaOption.id}>{arenaOption.name}</option>
              ))}
            </select>
          </div>
          <button className="btn-primary" type="submit">Load Arena</button>
        </form>
      )}

      {arenaId ? (
        <div className="grid lg:grid-cols-2 gap-8">
          <form action="/api/admin/slots" method="POST" className="glass-card space-y-6">
          <input type="hidden" name="action" value="slot_template" />
          {arenaId && <input type="hidden" name="arena_id" value={arenaId} />}
          <h2 className="text-2xl font-black uppercase italic">Slot Template</h2>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
            One line per slot: <code>18:00-19:00,500</code> or <code>18:00-19:00,500,1</code>
          </p>
          <textarea name="slots_text" rows={10} className="input-field" placeholder="18:00-19:00,500" />
          <textarea name="notes" rows={3} className="input-field" placeholder="Notes" />
          <button className="btn-primary" type="submit">
            {context.role === 'super_admin' ? 'Apply Slots' : 'Request Slot Change'}
          </button>
          </form>

          <form action="/api/admin/slots" method="POST" className="glass-card space-y-6">
          <input type="hidden" name="action" value="entry_mode" />
          {arenaId && <input type="hidden" name="arena_id" value={arenaId} />}
          <h2 className="text-2xl font-black uppercase italic">Entry Mode</h2>
          <select name="mode" className="input-field" defaultValue="open">
            <option value="open">Open</option>
            <option value="blocked">Blocked</option>
            <option value="free">Free Entry</option>
          </select>
          <textarea name="notes" rows={3} className="input-field" placeholder="Notes" />
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

      {arena && (
        <div className="glass-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black uppercase italic">{arena.name}</h2>
            {context.role === 'super_admin' && (
              <Link href="/admin/approvals" className="text-primary text-[10px] font-bold uppercase tracking-widest">
                Review approvals →
              </Link>
            )}
          </div>

          <p className="label-classic !ml-0 mb-4">Current entry mode: {entryMode}</p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {slots.map((slot) => (
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
