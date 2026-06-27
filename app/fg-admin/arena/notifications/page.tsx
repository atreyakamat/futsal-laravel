import { redirect } from 'next/navigation';
import { readAuthUserId } from '@/lib/session';
import { getAdminContext, getNotifications, markNotificationsRead } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export default async function ArenaNotificationsPage() {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || context.role !== 'arena_admin' || !userId) {
    return redirect('/fg-admin/login');
  }

  const notifications = await getNotifications(userId, 'arena_admin');

  if (notifications.some((n) => !n.is_read)) {
    await markNotificationsRead(userId, 'arena_admin');
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-20 space-y-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
            System <span className="text-primary text-stroke">Notifications</span>
          </h1>
          <p className="label-classic !ml-0">Updates from Super Admin on your requests</p>
        </div>
        <a href="/fg-admin/arena/dashboard" className="btn-secondary !py-2 !px-4 !rounded-xl text-[10px]">
          ← DASHBOARD
        </a>
      </div>

      <div className="space-y-4 max-w-3xl">
        {notifications.length === 0 ? (
          <div className="glass-card text-center py-20">
            <span className="material-symbols-outlined text-4xl mb-4 block text-white/20">notifications_off</span>
            <p className="text-sm font-bold uppercase tracking-widest text-white/40">No notifications found.</p>
          </div>
        ) : (
          notifications.map((notif: any) => (
            <div key={notif.id} className={`glass-card p-6 border-l-4 ${notif.is_read ? 'border-white/20' : 'border-primary'}`}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-black italic text-lg uppercase">{notif.title}</h3>
                <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">{new Date(notif.created_at).toLocaleString()}</span>
              </div>
              <p className="text-white/80 text-sm">{notif.message}</p>
              {notif.request_type && (
                <div className="mt-4 inline-block bg-primary/20 text-primary border border-primary/30 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest">
                  {notif.request_type.replace(/_/g, ' ')}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
