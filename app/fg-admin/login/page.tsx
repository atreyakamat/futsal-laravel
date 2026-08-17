import { redirect } from 'next/navigation';
import { readAuthUserId } from '@/lib/session';
import { getAdminContext } from '@/lib/admin';
import UnifiedLoginForm from '@/components/UnifiedLoginForm';

export const dynamic = 'force-dynamic';

// Matches the redirect targets UnifiedLoginForm itself uses right after a
// fresh login — reused here so an already-logged-in admin who navigates
// back to this page skips straight past the form instead of being asked
// for credentials again even though their session cookie is still valid.
const ROLE_REDIRECT: Record<string, string> = {
  super_admin: '/fg-admin/platform/dashboard',
  arena_admin: '/fg-admin/platform/dashboard',
  manager: '/fg-admin/arena/dashboard',
  security: '/fg-admin/security/scan',
  accountant: '/fg-admin/accountant/dashboard',
};

export default async function AdminLoginPage() {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (context) {
    redirect(ROLE_REDIRECT[context.role] || '/fg-admin/platform/dashboard');
  }

  return <UnifiedLoginForm />;
}
