import EditArenaForm from '@/components/EditArenaForm';
import { readAuthUserId } from '@/lib/session';
import { getAdminContext } from '@/lib/admin';
import { getArenaById } from '@/lib/domain';
import { redirect } from 'next/navigation';

export default async function EditArenaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || context.role !== 'super_admin') {
    redirect('/fg-admin/platform/login');
  }

  const arena = await getArenaById(Number(id));

  if (!arena) {
    redirect('/fg-admin/platform/arenas');
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <div className="mb-12">
        <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-4">
          Edit <span className="text-primary">Arena</span>
        </h1>
        <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">
          Update {arena.name}
        </p>
      </div>

      <EditArenaForm arena={arena} />
    </div>
  );
}
