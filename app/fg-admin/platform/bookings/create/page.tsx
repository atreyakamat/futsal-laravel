import { readAuthUserId } from '@/lib/session';
import { getAdminContext, listArenas } from '@/lib/admin';
import { getArenaById } from '@/lib/domain';
import { redirect } from 'next/navigation';
import StaffBookingForm from '@/components/StaffBookingForm';

export default async function AdminBookingCreatePage() {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || !['super_admin', 'admin', 'arena_admin', 'manager'].includes(context.role)) {
    redirect('/fg-admin/platform/bookings');
  }

  // manager is scoped to their own single arena; everyone else (super_admin,
  // and the platform-wide arena_admin) picks from every arena.
  const arenas = context.role === 'manager' ? [] : await listArenas();
  const scopedArenaId = context.role === 'manager' ? context.arenaId : null;
  const scopedArena = scopedArenaId ? await getArenaById(scopedArenaId) : null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <div className="mb-12">
        <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
          Create <span className="text-primary text-stroke">Booking</span>
        </h1>
        <p className="label-classic !ml-0">Backend booking form for admin operations</p>
      </div>

      <StaffBookingForm
        arenas={context.role !== 'manager' ? arenas : []}
        scopedArenaId={scopedArenaId}
        scopedArenaName={scopedArena?.name ?? null}
      />
    </div>
  );
}
