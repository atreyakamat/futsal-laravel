import { readAuthUserId, readAuthRole } from '@/lib/session';
import { getAdminContext, getArenaEntryMode } from '@/lib/admin';
import { getArenaById, getArenaPricing, query } from '@/lib/domain';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ArenaAdminSlotsPage() {
  const userId = await readAuthUserId();
  const role = await readAuthRole();
  const context = await getAdminContext(userId);

  if (!context || role !== 'arena_admin' || !context.arenaId) {
    redirect('/fg-admin/login');
  }

  const arenaId = context.arenaId;
  const arena = await getArenaById(arenaId);
  const entryMode = await getArenaEntryMode(arenaId);

  const [slots, timings, approvalRequests] = await Promise.all([
    getArenaPricing(arenaId),
    query<{ id: number; time_slot: string; start_time: string; end_time: string; day_of_week: number | null }>(
      `SELECT id, time_slot, start_time, end_time, day_of_week
         FROM slot_timings
        WHERE arena_id = ?
        ORDER BY start_time ASC`,
      [arenaId]
    ),
    query<{
      id: number;
      request_type: string;
      arena_id: number | null;
      requested_by: number | null;
      status: string;
      notes: string | null;
      payload_json: string | null;
      created_at: string;
    }>(
      `SELECT id, request_type, arena_id, requested_by, status, notes, payload_json, created_at
         FROM approval_requests
        WHERE arena_id = ?
        ORDER BY created_at DESC
        LIMIT 50`,
      [arenaId]
    ),
  ]);

  const freeBookings = approvalRequests.filter((req: any) => req.request_type === 'FREE_BOOKING_REQUEST').map((fb: any) => {
    const payload = fb.payload_json ? JSON.parse(fb.payload_json) : {};
    return {
      id: fb.id,
      booking_date: payload.bookingDate || '',
      time_slot: payload.slots ? payload.slots.join(', ') : '',
      number_of_rounds: 1,
      status: fb.status,
      rejection_reason: fb.decision_reason
    };
  });

  const getDayName = (day: number | null) => {
    if (day === null) return 'All Days';
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-20 space-y-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
            Slot <span className="text-primary text-stroke">Management</span>
          </h1>
          <p className="label-classic !ml-0">Submit operational changes and request approvals for {arena?.name}</p>
        </div>
        <Link href="/fg-admin/arena/dashboard" className="btn-secondary !py-2 !px-4 !rounded-xl text-[10px]">
          ← DASHBOARD
        </Link>
      </div>

      {/* Forms Grid */}
      <div className="grid lg:grid-cols-2 gap-8">
        <form action="/api/fg-admin/platform/slots" method="POST" className="glass-card space-y-6">
          <input type="hidden" name="action" value="slot_template" />
          <input type="hidden" name="arena_id" value={arenaId} />
          <h2 className="text-2xl font-black uppercase italic">Request Slot Template Change</h2>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
            Format: One line per slot: <code>18:00-19:00,500</code> (hour-range, price)
          </p>
          <textarea name="slots_text" rows={8} className="input-field" placeholder="18:00-19:00,500" required />
          <textarea name="notes" rows={2} className="input-field" placeholder="Why is this slot template being changed?" required />
          <button className="btn-primary w-full" type="submit">Submit Slot Template Request</button>
        </form>

        <form action="/api/fg-admin/platform/slots" method="POST" className="glass-card space-y-6">
          <input type="hidden" name="action" value="entry_mode" />
          <input type="hidden" name="arena_id" value={arenaId} />
          <h2 className="text-2xl font-black uppercase italic">Request Entry Mode Change</h2>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
            Open (Public bookings), Blocked (Shutdown turf), Free Entry (No fees)
          </p>
          <select name="mode" className="input-field" defaultValue={entryMode}>
            <option value="open">Open</option>
            <option value="blocked">Blocked</option>
            <option value="free">Free Entry</option>
          </select>
          <textarea name="notes" rows={4} className="input-field" placeholder="Reason for changing turf entry mode?" required />
          <button className="btn-primary w-full" type="submit">Submit Entry Mode Request</button>
        </form>
      </div>

      {/* Timings and Free Booking Request */}
      <div className="grid lg:grid-cols-2 gap-8">
        <form action="/api/fg-admin/platform/slots" method="POST" className="glass-card space-y-6">
          <input type="hidden" name="action" value="timing_update" />
          <input type="hidden" name="arena_id" value={arenaId} />
          <h2 className="text-2xl font-black uppercase italic">Request Arena Timings</h2>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
            Define operating/session slots (e.g. Morning Sessions)
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="label-classic">Slot Name</label>
              <input name="time_slot" className="input-field" placeholder="e.g. Evening Peak" required />
            </div>
            <div className="space-y-2">
              <label className="label-classic">Day of Week</label>
              <select name="day_of_week" className="input-field">
                <option value="">All Days</option>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
                <option value="0">Sunday</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="label-classic">Start Time</label>
              <input name="start_time" type="time" className="input-field" required />
            </div>
            <div className="space-y-2">
              <label className="label-classic">End Time</label>
              <input name="end_time" type="time" className="input-field" required />
            </div>
          </div>
          <textarea name="notes" rows={2} className="input-field" placeholder="Notes/Reason" required />
          <button className="btn-primary w-full" type="submit">Submit Timing Request</button>
        </form>

        <form action="/api/fg-admin/arena/bookings/request-approval" method="POST" className="glass-card space-y-6">
          <h2 className="text-2xl font-black uppercase italic">Request Free Booking Approval</h2>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
            Book slots for VIP, coaching, or maintenance events without fee charges.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="label-classic">Date</label>
              <input name="date" type="date" className="input-field" required />
            </div>
            <div className="space-y-2">
              <label className="label-classic">Time Slot</label>
              <input name="time_slot" className="input-field" placeholder="e.g. 19:00-20:00" required />
            </div>
          </div>
          <div className="space-y-2">
            <label className="label-classic">Rounds / Hours</label>
            <input name="number_of_rounds" type="number" min={1} max={3} defaultValue={1} className="input-field" required />
          </div>
          <textarea name="reason" rows={2} className="input-field" placeholder="Event details/Reason" required />
          <button className="btn-primary w-full" type="submit">Submit Free Booking Request</button>
        </form>
        <form action="/api/fg-admin/arena/requests" method="POST" className="glass-card space-y-6 mt-8">
          <input type="hidden" name="request_type" value="BLOCK_SLOT_REQUEST" />
          <h2 className="text-2xl font-black uppercase italic">Request Slot Block</h2>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
            Block a specific slot from being booked by customers.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="label-classic">Date</label>
              <input name="payload[bookingDate]" type="date" className="input-field" required />
            </div>
            <div className="space-y-2">
              <label className="label-classic">Time Slot</label>
              <input name="payload[slots][]" className="input-field" placeholder="e.g. 19:00-20:00" required />
            </div>
          </div>
          <textarea name="reason" rows={2} className="input-field" placeholder="Reason for blocking" required />
          <button className="btn-primary w-full" type="submit">Submit Block Request</button>
        </form>
      </div>

      {/* Lists Section */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Active Timings & Pricings */}
        <div className="space-y-6">
          <div className="glass-card">
            <h2 className="text-2xl font-bold uppercase italic mb-6">Current Configured Timings</h2>
            {timings.length === 0 ? (
              <p className="text-white/20 text-xs font-bold uppercase tracking-widest">No custom timings defined.</p>
            ) : (
              <div className="space-y-4">
                {timings.map((t: any) => (
                  <div key={t.id} className="flex justify-between items-center p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <div>
                      <span className="font-bold text-white block">{t.time_slot}</span>
                      <span className="text-[10px] text-white/40 uppercase tracking-widest">{getDayName(t.day_of_week)}</span>
                    </div>
                    <span className="font-black text-primary italic">{t.start_time} - {t.end_time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card">
            <h2 className="text-2xl font-black uppercase italic mb-6">Active Pricing & Slots</h2>
            <div className="grid grid-cols-2 gap-4">
              {slots.map((s: any) => (
                <div key={s.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Slot</div>
                  <div className="font-black text-white italic truncate">{s.time_slot}</div>
                  <div className="font-black text-primary mt-2">₹{Number(s.price)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Requests & Approvals Status */}
        <div className="space-y-6">
          <div className="glass-card">
            <h2 className="text-2xl font-black uppercase italic mb-6">Operational Requests</h2>
            {approvalRequests.length === 0 ? (
              <p className="text-white/20 text-xs font-bold uppercase tracking-widest">No recent requests.</p>
            ) : (
              <div className="space-y-4">
                {approvalRequests.map((ar: any) => (
                  <div key={ar.id} className="flex justify-between items-center p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <div>
                      <span className="font-bold text-white block capitalize">{ar.request_type.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-white/40 uppercase tracking-widest">{new Date(ar.created_at).toLocaleString()}</span>
                      {ar.notes && <p className="text-xs text-white/60 mt-1 italic">"{ar.notes}"</p>}
                    </div>
                    <span className={`pill-status uppercase tracking-widest text-[9px] ${
                      ar.status === 'approved' ? 'border-primary/20 text-primary' :
                      ar.status === 'rejected' ? 'border-red-500/20 text-red-400' : 'border-yellow-500/20 text-yellow-500'
                    }`}>
                      {ar.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card">
            <h2 className="text-2xl font-black uppercase italic mb-6">Free Booking Approvals</h2>
            {freeBookings.length === 0 ? (
              <p className="text-white/20 text-xs font-bold uppercase tracking-widest">No recent free bookings requests.</p>
            ) : (
              <div className="space-y-4">
                {freeBookings.map((fb: any) => (
                  <div key={fb.id} className="flex justify-between items-center p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <div>
                      <span className="font-bold text-white block">{fb.booking_date} | {fb.time_slot}</span>
                      <span className="text-[10px] text-white/40 uppercase tracking-widest">Hours: {fb.number_of_rounds ?? 1}</span>
                      {fb.rejection_reason && <p className="text-xs text-red-400 mt-1 italic">Rejection: "{fb.rejection_reason}"</p>}
                    </div>
                    <span className={`pill-status uppercase tracking-widest text-[9px] ${
                      fb.status === 'approved' ? 'border-primary/20 text-primary' :
                      fb.status === 'rejected' ? 'border-red-500/20 text-red-400' : 'border-yellow-500/20 text-yellow-500'
                    }`}>
                      {fb.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
