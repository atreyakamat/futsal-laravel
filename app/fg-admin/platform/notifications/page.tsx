import { redirect } from 'next/navigation';
import { getAdminContext, getNotifications, markNotificationsRead } from '@/lib/admin';
import { readAuthUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || context.role !== 'super_admin') {
    redirect('/fg-admin/login');
  }
  
  const notifications = await getNotifications(context.id, 'super_admin');
  
  // Mark them as read when viewed
  if (notifications.some(n => !n.is_read)) {
    await markNotificationsRead(context.id, 'super_admin');
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <a href="/fg-admin/platform/super-admin" className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
            <span className="material-symbols-outlined text-white">arrow_back</span>
          </a>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">System <span className="text-primary">Notifications</span></h1>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Inbox & Alerts</p>
          </div>
        </div>
      
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="glass-card text-center py-20">
              <span className="material-symbols-outlined text-5xl text-white/10 mb-4">notifications_off</span>
              <p className="text-gray-500 font-bold uppercase tracking-widest">No notifications found.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div 
                key={notif.id} 
                className={`glass-card !p-6 border-l-4 transition-colors ${
                  notif.is_read ? 'border-l-white/10' : 'border-l-primary bg-primary/5'
                }`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="font-black uppercase tracking-tight text-lg mb-1">{notif.title}</h3>
                    <p className="text-gray-400 text-sm">{notif.message}</p>
                    
                    {notif.request_type && (
                      <div className="mt-4 inline-block bg-white/5 text-primary text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest border border-white/10">
                        {notif.request_type.replace(/_/g, ' ')}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">
                    {new Date(notif.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
