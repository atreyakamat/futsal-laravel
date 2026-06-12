import { readAuthUserId } from '@/lib/session';
import { getAdminContext, listArenas } from '@/lib/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminArenasPage() {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context) {
    redirect('/fg-admin/platform/login');
  }

  let arenas = await listArenas();
  
  // Filter arenas based on context
  if (context.role !== 'super_admin' && context.arenaId) {
    arenas = arenas.filter(a => a.id === context.arenaId);
  } else if (context.role !== 'super_admin') {
    // Non-super admin without an arena assignment
    arenas = [];
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
            Manage <span className="text-primary text-stroke">Arenas</span>
          </h1>
          <p className="label-classic !ml-0">Total Arenas: {arenas?.length || 0}</p>
        </div>
        {context.role === 'super_admin' && (
          <Link href="/fg-admin/platform/arenas/create" className="btn-primary flex items-center gap-2">
            <span className="material-symbols-outlined">add</span>
            CREATE NEW ARENA
          </Link>
        )}
      </div>

      {!arenas || arenas?.length === 0 ? (
        <div className="glass-card text-center py-32">
          <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-5xl text-white/10">stadium</span>
          </div>
          <h2 className="text-2xl font-black uppercase mb-4 italic">No Arenas Yet</h2>
          <p className="text-white/40 mb-10 max-w-sm mx-auto">Start building your network by adding your first futsal arena.</p>
          <Link
            href="/fg-admin/platform/arenas/create"
            className="btn-primary"
          >
            Create Your First Arena
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {(arenas || []).map((arena) => (
            <div key={arena.id} className="glass-card !p-0 overflow-hidden group hover:border-primary/30 transition-all duration-500">
              <div className="p-8 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex items-center gap-6 flex-1">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                    <span className="material-symbols-outlined text-3xl">stadium</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight italic group-hover:text-primary transition-colors">
                      {arena.name}
                    </h3>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-white/40 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">location_on</span>
                        {arena.address || 'No address set'}
                      </span>
                      <span className={`pill-status ${arena.status === 'active' ? 'border-primary/20 text-primary' : 'border-red-500/20 text-red-500'}`}>
                        {arena.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {context.role === 'super_admin' && (
                    <Link
                      href={`/fg-admin/platform/arenas/edit/${arena.id}`}
                      className="btn-secondary !py-3 !px-4 !rounded-xl"
                      title="Edit Arena"
                    >
                      <span className="material-symbols-outlined">edit</span>
                    </Link>
                  )}
                  <Link
                    href={`/arena/${arena.slug}`}
                    target="_blank"
                    className="btn-secondary !py-3 !px-4 !rounded-xl"
                    title="View Public Page"
                  >
                    <span className="material-symbols-outlined">visibility</span>
                  </Link>
                  <Link href="/fg-admin/platform/slots" className="btn-secondary !py-3 !px-4 !rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined">schedule</span>
                      <span className="font-black text-[10px] tracking-widest uppercase">Slots</span>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
