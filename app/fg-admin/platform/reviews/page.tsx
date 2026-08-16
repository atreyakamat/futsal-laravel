import { readAuthUserId } from '@/lib/session';
import { getAdminContext } from '@/lib/admin';
import { redirect } from 'next/navigation';
import ReviewsModerationClient from '@/components/ReviewsModerationClient';

export const dynamic = 'force-dynamic';

export default async function ReviewsModerationPage() {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || context.role !== 'super_admin') {
    redirect('/fg-admin/platform/dashboard');
  }

  return <ReviewsModerationClient />;
}
