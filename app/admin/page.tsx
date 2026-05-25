import CreateArenaForm from '@/components/CreateArenaForm';
import { readAuthUserId } from '@/lib/session';
import { query } from '@/lib/db';
import { redirect } from 'next/navigation';

async function isAdmin(userId: number | null): Promise<boolean> {
  if (!userId) return false;
  
  const user = await query<{ role: string }>(
    'SELECT role FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  
  return user.length > 0 && (user[0].role === 'admin' || user[0].role === 'super_admin');
}

export default async function AdminDashboardPage() {
  const userId = await readAuthUserId();

  if (!(await isAdmin(userId))) {
    redirect('/');
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-12">
        Admin <span className="text-primary">Dashboard</span>
      </h1>
      
      <CreateArenaForm />
    </div>
  );
}
