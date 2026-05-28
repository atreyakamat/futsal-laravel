import { readAuthUserId } from '@/lib/session';
import { getAdminContext, listArenas } from '@/lib/admin';
import { redirect } from 'next/navigation';

export default async function AdminBookingCreatePage() {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || !['super_admin', 'admin'].includes(context.role)) {
    redirect('/admin/bookings');
  }

  const arenas = await listArenas();

  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <div className="mb-12">
        <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
          Create <span className="text-primary text-stroke">Booking</span>
        </h1>
        <p className="label-classic !ml-0">Backend booking form for admin operations</p>
      </div>

      <form action="/api/admin/bookings" method="POST" className="glass-card space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="label-classic">Arena</label>
            <select name="arena_id" className="input-field" defaultValue={arenas[0]?.id ?? ''}>
              {arenas.map((arena) => (
                <option key={arena.id} value={arena.id}>{arena.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="label-classic">Booking Date</label>
            <input type="date" name="date" className="input-field" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="label-classic">Slots (one per line: 18:00-19:00)</label>
          <textarea name="slots" rows={6} className="input-field" placeholder={`18:00-19:00\n19:00-20:00`} />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="label-classic">Customer Name</label>
            <input name="customer_name" className="input-field" />
          </div>
          <div className="space-y-2">
            <label className="label-classic">Customer Mobile</label>
            <input name="customer_mobile" className="input-field" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="label-classic">Customer Email</label>
          <input name="customer_email" type="email" className="input-field" />
        </div>

        <label className="inline-flex items-center gap-3 text-xs font-black uppercase tracking-widest">
          <input type="checkbox" name="free_booking" value="true" className="w-4 h-4 accent-primary" />
          Free booking (requires super admin approval if created by admin)
        </label>

        <div className="space-y-2">
          <label className="label-classic">Notes</label>
          <textarea name="notes" rows={3} className="input-field" />
        </div>

        <button className="btn-primary" type="submit">Submit Booking</button>
      </form>
    </div>
  );
}
