import { readAuthRole, readAuthUserId } from '@/lib/session';
import { getAdminArenaAssignments } from '@/lib/super-admin';
import { query } from '@/lib/db';
import { redirect } from 'next/navigation';
import SelectArenaClient from '@/components/SelectArenaClient';

export const dynamic = 'force-dynamic';

export default async function SelectArenaPage() {
  const role = await readAuthRole();
  const userId = await readAuthUserId();

  if (!userId || role !== 'arena_admin') {
    redirect('/fg-admin/login');
  }

  const assignedArenaIds = await getAdminArenaAssignments(userId);

  if (assignedArenaIds.length === 0) {
    // Platform-wide — nothing to pick, this page isn't for them.
    redirect('/fg-admin/platform/dashboard');
  }

  // Login auto-selects when exactly one turf is assigned, so this page
  // normally only renders for 2+. If reached directly with just one (e.g.
  // an admin's assignments changed mid-session), the picker below just
  // shows a single option — still correct, no special-casing needed.
  const arenas = await query<{ id: number; name: string; slug: string }>(
    `SELECT id, name, slug FROM arenas WHERE id = ANY(?) ORDER BY name`,
    [assignedArenaIds]
  );

  return (
    <div className="max-w-2xl mx-auto px-6 py-20">
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter italic mb-2">
          Choose A <span className="text-primary text-stroke">Turf</span>
        </h1>
        <p className="text-white/50 text-sm">
          Your account is assigned to {arenas.length} turfs. Pick one to open its dashboard — you can switch to another any time.
        </p>
      </div>
      <SelectArenaClient arenas={arenas} />
    </div>
  );
}
