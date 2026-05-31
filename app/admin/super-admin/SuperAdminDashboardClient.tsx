'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface SuperAdminSettings {
  id: number;
  email: string;
  permissions: string[];
  is_active: boolean;
  last_login: string | null;
}

interface Arena {
  id: number;
  name: string;
  slug: string;
  status: string;
  address?: string;
  contact_email?: string;
  contact_phone?: string;
}

interface AdminUser {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  created_at: string;
}

interface SecurityStaff {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  permissions: string;
  is_active: boolean;
}

interface ArenaTiming {
  id: number;
  time_slot: string;
  start_time: string;
  end_time: string;
}

export default function SuperAdminDashboardClient() {
  const [settings, setSettings] = useState<SuperAdminSettings | null>(null);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const router = useRouter();

  // Form states
  const [showArenaForm, setShowArenaForm] = useState(false);
  const [arenaName, setArenaName] = useState('');
  const [arenaSlug, setArenaSlug] = useState('');
  const [arenaAddress, setArenaAddress] = useState('');
  
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [selectedArenaId, setSelectedArenaId] = useState<number | null>(null);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  
  const [showSecurityForm, setShowSecurityForm] = useState(false);
  const [securityName, setSecurityName] = useState('');
  const [securityEmail, setSecurityEmail] = useState('');
  const [securityPhone, setSecurityPhone] = useState('');

  const [arenaAdmins, setArenaAdmins] = useState<AdminUser[]>([]);
  const [securityStaff, setSecurityStaff] = useState<SecurityStaff[]>([]);

  // Timing and Booking states
  const [showTimingForm, setShowTimingForm] = useState(false);
  const [timingSlot, setTimingSlot] = useState('');
  const [timingStartTime, setTimingStartTime] = useState('');
  const [timingEndTime, setTimingEndTime] = useState('');
  const [arenaTimings, setArenaTimings] = useState<ArenaTiming[]>([]);

  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTimeSlot, setBookingTimeSlot] = useState('');
  const [bookingRounds, setBookingRounds] = useState(1);
  const [bookingReason, setBookingReason] = useState('');

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const settingsRes = await fetch('/api/super-admin/settings');
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData.data || null);
      } else if (settingsRes.status === 401) {
        router.push('/admin/super-admin-login');
        return;
      }

      const arenasRes = await fetch('/api/super-admin/arenas');
      if (arenasRes.ok) {
        const arenasData = await arenasRes.json();
        setArenas(arenasData.data || []);
      }
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchArenaDetails = useCallback(async (arenaId: number) => {
    try {
      const adminsRes = await fetch(`/api/super-admin/admins?arena_id=${arenaId}`);
      if (adminsRes.ok) {
        const adminsData = await adminsRes.json();
        setArenaAdmins(adminsData.data || []);
      }

      const securityRes = await fetch(`/api/super-admin/security?arena_id=${arenaId}`);
      if (securityRes.ok) {
        const securityData = await securityRes.json();
        setSecurityStaff(securityData.data || []);
      }

      const timingsRes = await fetch(`/api/super-admin/arenas/timings?arena_id=${arenaId}`);
      if (timingsRes.ok) {
        const timingsData = await timingsRes.json();
        setArenaTimings(timingsData.data || []);
      }
    } catch (err) {
      console.error('Error fetching arena details:', err);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (selectedArenaId) {
      fetchArenaDetails(selectedArenaId);
    }
  }, [selectedArenaId, fetchArenaDetails]);

  const handleCreateArena = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      const res = await fetch('/api/super-admin/arenas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: arenaName,
          slug: arenaSlug,
          address: arenaAddress
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setSuccess('Arena created successfully!');
        setArenaName('');
        setArenaSlug('');
        setArenaAddress('');
        setShowArenaForm(false);
        fetchInitialData();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to create arena');
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArenaId) return;
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/super-admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          arena_id: selectedArenaId,
          name: adminName,
          email: adminEmail
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setSuccess(`Admin created! Temporary password: ${data.data.credentials.tempPassword}`);
        setAdminName('');
        setAdminEmail('');
        setShowAdminForm(false);
        fetchArenaDetails(selectedArenaId);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to create admin');
    }
  };

  const handleCreateSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArenaId) return;
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/super-admin/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          arena_id: selectedArenaId,
          name: securityName,
          email: securityEmail,
          phone: securityPhone,
          permissions: ['verify_ticket', 'confirm_entry']
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setSuccess(`Security staff created! Temporary password: ${data.data.credentials.tempPassword}`);
        setSecurityName('');
        setSecurityEmail('');
        setSecurityPhone('');
        setShowSecurityForm(false);
        fetchArenaDetails(selectedArenaId);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to create security staff');
    }
  };

  const handleCreateTiming = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArenaId) return;
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/super-admin/arenas/timings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          arena_id: selectedArenaId,
          time_slot: timingSlot,
          start_time: timingStartTime,
          end_time: timingEndTime
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setSuccess('Timing created successfully!');
        setTimingSlot('');
        setTimingStartTime('');
        setTimingEndTime('');
        setShowTimingForm(false);
        fetchArenaDetails(selectedArenaId);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to create timing');
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArenaId) return;
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/super-admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          arena_id: selectedArenaId,
          date: bookingDate,
          time_slot: bookingTimeSlot,
          number_of_rounds: bookingRounds,
          reason: bookingReason
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setSuccess('Booking created successfully!');
        setBookingDate('');
        setBookingTimeSlot('');
        setBookingRounds(1);
        setBookingReason('');
        setShowBookingForm(false);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to create booking');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/admin/super-admin-login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Not authenticated'}</p>
          <a href="/admin/super-admin-login" className="px-6 py-2 btn-primary rounded-full inline-block">
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  const safeArenas = arenas || [];
  const safeAdmins = arenaAdmins || [];
  const safeSecurity = securityStaff || [];
  const safeTimings = arenaTimings || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">
                admin_panel_settings
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Super Admin Panel</h1>
              <p className="text-xs text-gray-500">{settings.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            Logout
          </button>
        </div>
      </header>

      {/* Sidebar + Main */}
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 border-r border-white/10 min-h-screen">
          <nav className="sticky top-0 space-y-1 p-4">
            {[
              { id: 'overview', label: 'Overview', icon: 'dashboard' },
              { id: 'arenas', label: 'Arena & Staff', icon: 'location_on' },
              { id: 'timings', label: 'Timings', icon: 'schedule' },
              { id: 'bookings', label: 'Bookings', icon: 'calendar_today' },
              { id: 'approvals', label: 'Approvals', icon: 'check_circle' },
              { id: 'reports', label: 'Reports', icon: 'assessment' },
              { id: 'settings', label: 'Settings', icon: 'settings' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === item.id
                    ? 'bg-primary/20 text-primary'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-bold">
              {success}
              <button onClick={() => setSuccess('')} className="ml-4 text-xs underline">Dismiss</button>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold italic tracking-tighter uppercase">Dashboard <span className="text-primary">Overview</span></h2>
                  <p className="text-primary font-semibold text-xs mt-1 uppercase tracking-widest">
                    Role: SUPER ADMIN
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card">
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Total Arenas</p>
                  <p className="text-4xl font-black italic text-white">{safeArenas?.length}</p>
                </div>
                <div className="glass-card">
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Account Email</p>
                  <p className="text-sm font-bold truncate">{settings.email}</p>
                </div>
                <div className="glass-card">
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">System Status</p>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-sm font-bold text-green-400 uppercase tracking-widest">Operational</p>
                  </div>
                </div>
              </div>

              <div className="mt-12">
                <h3 className="text-xl font-black italic tracking-tighter uppercase mb-6">Recent <span className="text-primary">Arenas</span></h3>
                <div className="grid gap-4">
                  {safeArenas.slice(0, 3).map(arena => (
                    <div key={arena.id} className="glass-card flex items-center justify-between">
                      <div>
                        <h4 className="font-bold uppercase tracking-tight italic">{arena.name}</h4>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">{arena.slug}</p>
                      </div>
                      <button 
                        onClick={() => { setActiveTab('arenas'); setSelectedArenaId(arena.id); }}
                        className="text-primary text-xs font-bold uppercase tracking-widest hover:text-white"
                      >
                        Manage →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'arenas' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold italic tracking-tighter uppercase">Arena & <span className="text-primary">Staff Management</span></h2>
                <button
                  onClick={() => setShowArenaForm(true)}
                  className="btn-primary text-xs"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  CREATE ARENA
                </button>
              </div>

              {/* Arena Creation Modal/Form */}
              {showArenaForm && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="glass-card w-full max-w-md">
                    <h3 className="text-xl font-black italic uppercase mb-6">Create New <span className="text-primary">Arena</span></h3>
                    <form onSubmit={handleCreateArena} className="space-y-4">
                      <div>
                        <label className="label-classic">Arena Name</label>
                        <input 
                          className="input-field" 
                          value={arenaName} 
                          onChange={e => setArenaName(e.target.value)}
                          placeholder="e.g. Angle Futsal Central"
                          required
                        />
                      </div>
                      <div>
                        <label className="label-classic">Arena Slug</label>
                        <input 
                          className="input-field" 
                          value={arenaSlug} 
                          onChange={e => setArenaSlug(e.target.value)}
                          placeholder="e.g. angle-futsal-central"
                          required
                        />
                      </div>
                      <div>
                        <label className="label-classic">Address</label>
                        <input 
                          className="input-field" 
                          value={arenaAddress} 
                          onChange={e => setArenaAddress(e.target.value)}
                          placeholder="Full address"
                        />
                      </div>
                      <div className="flex gap-4 pt-4">
                        <button type="submit" className="btn-primary flex-1">CREATE</button>
                        <button type="button" onClick={() => setShowArenaForm(false)} className="btn-secondary flex-1">CANCEL</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="grid lg:grid-cols-3 gap-8">
                {/* Arenas List */}
                <div className="lg:col-span-1 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-4">Select Arena</h3>
                  <div className="max-h-[600px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                    {safeArenas.map((arena) => (
                      <button
                        key={arena.id}
                        onClick={() => setSelectedArenaId(arena.id)}
                        className={`w-full glass-card !p-4 text-left transition-all ${
                          selectedArenaId === arena.id ? 'border-primary bg-primary/5' : 'hover:border-white/20'
                        }`}
                      >
                        <h4 className="font-bold uppercase italic tracking-tight">{arena.name}</h4>
                        <p className="text-[10px] text-gray-500 font-bold tracking-widest">{arena.slug}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Arena Staff Management */}
                <div className="lg:col-span-2 space-y-8">
                  {!selectedArenaId ? (
                    <div className="glass-card h-full flex items-center justify-center text-center p-12">
                      <p className="text-gray-500 font-bold uppercase tracking-widest italic">Select an arena to manage staff</p>
                    </div>
                  ) : (
                    <>
                      {/* Admin Management Section */}
                      <section className="space-y-6">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                          <h3 className="text-lg font-black italic uppercase tracking-tight">Arena <span className="text-primary">Admins</span></h3>
                          <button onClick={() => setShowAdminForm(true)} className="text-xs font-bold uppercase tracking-widest text-primary hover:text-white transition-colors">
                            + ADD ADMIN
                          </button>
                        </div>

                        {showAdminForm && (
                          <div className="glass-card !bg-white/5 border-primary/30">
                            <form onSubmit={handleCreateAdmin} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <input 
                                className="input-field" 
                                value={adminName} 
                                onChange={e => setAdminName(e.target.value)}
                                placeholder="Full Name"
                                required
                              />
                              <input 
                                className="input-field" 
                                type="email"
                                value={adminEmail} 
                                onChange={e => setAdminEmail(e.target.value)}
                                placeholder="Email Address"
                                required
                              />
                              <div className="flex gap-2">
                                <button type="submit" className="btn-primary flex-1 !py-0">ADD</button>
                                <button type="button" onClick={() => setShowAdminForm(false)} className="btn-secondary !py-0">X</button>
                              </div>
                            </form>
                          </div>
                        )}

                        <div className="grid gap-3">
                          {safeAdmins.map(admin => (
                            <div key={admin.id} className="glass-card !p-4 flex items-center justify-between">
                              <div>
                                <p className="font-bold uppercase italic tracking-tight">{admin.first_name} {admin.last_name}</p>
                                <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">{admin.email}</p>
                              </div>
                              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${admin.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                {admin.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          ))}
                          {safeAdmins?.length === 0 && (
                            <p className="text-center py-8 text-xs text-gray-500 font-bold uppercase tracking-widest">No admins assigned to this arena</p>
                          )}
                        </div>
                      </section>

                      {/* Security Staff Management Section */}
                      <section className="space-y-6">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                          <h3 className="text-lg font-black italic uppercase tracking-tight">Security <span className="text-primary">Staff</span></h3>
                          <button onClick={() => setShowSecurityForm(true)} className="text-xs font-bold uppercase tracking-widest text-primary hover:text-white transition-colors">
                            + ADD SECURITY
                          </button>
                        </div>

                        {showSecurityForm && (
                          <div className="glass-card !bg-white/5 border-primary/30">
                            <form onSubmit={handleCreateSecurity} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <input 
                                className="input-field" 
                                value={securityName} 
                                onChange={e => setSecurityName(e.target.value)}
                                placeholder="Full Name"
                                required
                              />
                              <input 
                                className="input-field" 
                                type="email"
                                value={securityEmail} 
                                onChange={e => setSecurityEmail(e.target.value)}
                                placeholder="Email"
                                required
                              />
                              <input 
                                className="input-field" 
                                value={securityPhone} 
                                onChange={e => setSecurityPhone(e.target.value)}
                                placeholder="Phone"
                              />
                              <div className="flex gap-2">
                                <button type="submit" className="btn-primary flex-1 !py-0">ADD</button>
                                <button type="button" onClick={() => setShowSecurityForm(false)} className="btn-secondary !py-0">X</button>
                              </div>
                            </form>
                          </div>
                        )}

                        <div className="grid gap-3">
                          {safeSecurity.map(staff => (
                            <div key={staff.id} className="glass-card !p-4 flex items-center justify-between">
                              <div>
                                <p className="font-bold uppercase italic tracking-tight">{staff.first_name} {staff.last_name}</p>
                                <div className="flex gap-4">
                                  <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">{staff.email}</p>
                                  {staff.phone && <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">{staff.phone}</p>}
                                </div>
                              </div>
                              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${staff.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                {staff.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          ))}
                          {safeSecurity?.length === 0 && (
                            <p className="text-center py-8 text-xs text-gray-500 font-bold uppercase tracking-widest">No security staff assigned to this arena</p>
                          )}
                        </div>
                      </section>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timings' && selectedArenaId && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold italic tracking-tighter uppercase">Arena <span className="text-primary">Timings</span></h2>
                <button
                  onClick={() => setShowTimingForm(true)}
                  className="btn-primary text-xs"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  CREATE TIMING
                </button>
              </div>

              {/* Timing Creation Form */}
              {showTimingForm && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="glass-card w-full max-w-md">
                    <h3 className="text-xl font-black italic uppercase mb-6">Create New <span className="text-primary">Timing</span></h3>
                    <form onSubmit={handleCreateTiming} className="space-y-4">
                      <div>
                        <label className="label-classic">Time Slot Name</label>
                        <input 
                          className="input-field" 
                          value={timingSlot} 
                          onChange={e => setTimingSlot(e.target.value)}
                          placeholder="e.g. Morning Slot"
                          required
                        />
                      </div>
                      <div>
                        <label className="label-classic">Start Time</label>
                        <input 
                          className="input-field" 
                          type="time"
                          value={timingStartTime} 
                          onChange={e => setTimingStartTime(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="label-classic">End Time</label>
                        <input 
                          className="input-field" 
                          type="time"
                          value={timingEndTime} 
                          onChange={e => setTimingEndTime(e.target.value)}
                          required
                        />
                      </div>
                      <div className="flex gap-4 pt-4">
                        <button type="submit" className="btn-primary flex-1">CREATE</button>
                        <button type="button" onClick={() => setShowTimingForm(false)} className="btn-secondary flex-1">CANCEL</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="grid gap-4">
                {safeTimings?.length > 0 ? (
                  safeTimings.map(timing => (
                    <div key={timing.id} className="glass-card flex items-center justify-between">
                      <div>
                        <h4 className="font-bold uppercase tracking-tight italic">{timing.time_slot}</h4>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">{timing.start_time} - {timing.end_time}</p>
                      </div>
                      <span className="text-primary text-xs font-bold uppercase tracking-widest">CONFIGURED</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-sm">No timings configured for this arena yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'bookings' && selectedArenaId && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold italic tracking-tighter uppercase">Arena <span className="text-primary">Bookings</span></h2>
                <button
                  onClick={() => setShowBookingForm(true)}
                  className="btn-primary text-xs"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  CREATE BOOKING
                </button>
              </div>

              {/* Booking Creation Form */}
              {showBookingForm && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="glass-card w-full max-w-md">
                    <h3 className="text-xl font-black italic uppercase mb-6">Block <span className="text-primary">Slots</span></h3>
                    <form onSubmit={handleCreateBooking} className="space-y-4">
                      <div>
                        <label className="label-classic">Date</label>
                        <input 
                          className="input-field" 
                          type="date"
                          value={bookingDate} 
                          onChange={e => setBookingDate(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="label-classic">Time Slot</label>
                        <input 
                          className="input-field" 
                          value={bookingTimeSlot} 
                          onChange={e => setBookingTimeSlot(e.target.value)}
                          placeholder="e.g. Morning Slot"
                          required
                        />
                      </div>
                      <div>
                        <label className="label-classic">Number of Rounds</label>
                        <select 
                          className="input-field" 
                          value={bookingRounds} 
                          onChange={e => setBookingRounds(Number(e.target.value))}
                          required
                        >
                          <option value={1}>1 Round</option>
                          <option value={2}>2 Rounds</option>
                          <option value={3}>3 Rounds</option>
                        </select>
                      </div>
                      <div>
                        <label className="label-classic">Reason (Optional)</label>
                        <textarea 
                          className="input-field" 
                          value={bookingReason} 
                          onChange={e => setBookingReason(e.target.value)}
                          placeholder="Why are these slots being blocked?"
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-4 pt-4">
                        <button type="submit" className="btn-primary flex-1">BLOCK SLOTS</button>
                        <button type="button" onClick={() => setShowBookingForm(false)} className="btn-secondary flex-1">CANCEL</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="text-center py-12 text-gray-400">
                <span className="material-symbols-outlined text-4xl mb-4 block">calendar_month</span>
                <p className="text-sm">Bookings created will appear here</p>
              </div>
            </div>
          )}

          {activeTab === 'approvals' && (
            <div className="space-y-6 text-center py-20">
              <span className="material-symbols-outlined text-6xl text-white/10 mb-6">verified_user</span>
              <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-4">Approval <span className="text-primary">System</span></h2>
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs max-w-sm mx-auto">Pending approval requests for slot templates and entry modes will appear here.</p>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6 text-center py-20">
              <span className="material-symbols-outlined text-6xl text-white/10 mb-6">analytics</span>
              <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-4">Global <span className="text-primary">Reports</span></h2>
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs max-w-sm mx-auto">Cross-arena performance metrics and revenue analytics under development.</p>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-2xl">
              <h2 className="text-3xl font-bold italic tracking-tighter uppercase">Global <span className="text-primary">Settings</span></h2>
              <div className="glass-card">
                <h3 className="text-sm font-black italic uppercase mb-4 border-b border-white/10 pb-2">Admin Profile</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Email</p>
                    <p className="text-sm font-bold">{settings.email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Status</p>
                    <p className="text-sm font-bold text-green-400 uppercase tracking-widest">Active</p>
                  </div>
                </div>
              </div>

              <div className="glass-card">
                <h3 className="text-sm font-black italic uppercase mb-4 border-b border-white/10 pb-2">Password</h3>
                <button
                  onClick={() => alert('Change password feature coming soon')}
                  className="btn-primary text-xs w-full"
                >
                  CHANGE SYSTEM PASSWORD
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
