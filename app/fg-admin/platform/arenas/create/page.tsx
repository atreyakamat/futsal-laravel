import CreateArenaForm from '@/components/CreateArenaForm';
import { readAuthUserId } from '@/lib/session';
import { getAdminContext } from '@/lib/admin';
import { redirect } from 'next/navigation';

export default async function CreateArenaPage() {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || context.role !== 'super_admin') {
    redirect('/fg-admin/platform/login');
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <div className="mb-12">
        <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-4">
          Create <span className="text-primary">Arena</span>
        </h1>
        <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">
          Add a new arena to the platform
        </p>
      </div>

      <CreateArenaForm />
    </div>
  );
}
