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
  const [approvals, setApprovals] = useState<any[]>([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const router = useRouter();

  // Form states
  const [showArenaForm, setShowArenaForm] = useState(false);
  const [editingArenaId, setEditingArenaId] = useState<number | null>(null);
  const [arenaName, setArenaName] = useState('');
  const [arenaSlug, setArenaSlug] = useState('');
  const [arenaAddress, setArenaAddress] = useState('');
  const [arenaCoverImage, setArenaCoverImage] = useState('');
  const [arenaLogoUrl, setArenaLogoUrl] = useState('');
  
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState<number | null>(null);
  const [selectedArenaId, setSelectedArenaId] = useState<number | null>(null);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  
  const [showSecurityForm, setShowSecurityForm] = useState(false);
  const [editingSecurityId, setEditingSecurityId] = useState<number | null>(null);
  const [securityName, setSecurityName] = useState('');
  const [securityEmail, setSecurityEmail] = useState('');
  const [securityPhone, setSecurityPhone] = useState('');
  const [securityPassword, setSecurityPassword] = useState('');

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

  
  const fetchApprovals = useCallback(async () => {
    try {
      setApprovalsLoading(true);
      const res = await fetch('/api/fg-admin/platform/approvals');
      const data = await res.json();
      if (res.ok && data.success) {
        setApprovals(data.requests);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setApprovalsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'approvals') {
      fetchApprovals();
    }
  }, [activeTab, fetchApprovals]);

  const handleRemoveAdmin = async (id: number) => {
    if (!selectedArenaId) return;
    if (!confirm('Are you sure you want to remove this admin?')) return;
    try {
      const res = await fetch(`/api/fg-admin/super-admin/admins/${id}?arena_id=${selectedArenaId}`, {
        method: 'DELETE'
      });
      if (res.ok) fetchArenaDetails(selectedArenaId);
    } catch (err) {
      console.error('Failed to remove admin:', err);
    }
  };

  const handleRemoveSecurity = async (id: number) => {
    if (!selectedArenaId) return;
    if (!confirm('Are you sure you want to remove this security staff?')) return;
    try {
      const res = await fetch(`/api/fg-admin/super-admin/security/${id}?arena_id=${selectedArenaId}`, {
        method: 'DELETE'
      });
      if (res.ok) fetchArenaDetails(selectedArenaId);
    } catch (err) {
      console.error('Failed to remove security:', err);
    }
  };

  const handleResolveRequest = async (id: number, decision: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/fg-admin/platform/approvals/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason: `${decision.toUpperCase()} by Super Admin` })
      });
      if (res.ok) {
        setSuccess(`Request ${decision} successfully`);
        fetchApprovals();
      } else {
        setError('Failed to resolve request');
      }
    } catch (e) {
      setError('Error resolving request');
    }
  };

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const settingsRes = await fetch('/api/fg-admin/super-admin/settings');
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData.data || null);
      } else if (settingsRes.status === 401) {
        router.push('/fg-admin/login');
        return;
      }

      const arenasRes = await fetch('/api/fg-admin/super-admin/arenas');
      if (arenasRes.ok) {
        const arenasData = await arenasRes.json();
        setArenas(arenasData.data || []);
      }

      const statsRes = await fetch('/api/fg-admin/super-admin/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data || null);
      }
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchArenaDetails = useCallback(async (arenaId: number) => {
    try {
      const adminsRes = await fetch(`/api/fg-admin/super-admin/admins?arena_id=${arenaId}`);
      if (adminsRes.ok) {
        const adminsData = await adminsRes.json();
        setArenaAdmins(adminsData.data || []);
      }

      const securityRes = await fetch(`/api/fg-admin/super-admin/security?arena_id=${arenaId}`);
      if (securityRes.ok) {
        const securityData = await securityRes.json();
        setSecurityStaff(securityData.data || []);
      }

      const timingsRes = await fetch(`/api/fg-admin/super-admin/arenas/timings?arena_id=${arenaId}`);
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
      const url = editingArenaId 
        ? `/api/fg-admin/super-admin/arenas/${editingArenaId}`
        : '/api/fg-admin/super-admin/arenas';
      const method = editingArenaId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: arenaName,
          slug: arenaSlug,
          address: arenaAddress,
          cover_image: arenaCoverImage,
          logo_url: arenaLogoUrl
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setSuccess(`Arena ${editingArenaId ? 'updated' : 'created'} successfully!`);
        setArenaName('');
        setArenaSlug('');
        setArenaAddress('');
        setArenaCoverImage('');
        setArenaLogoUrl('');
        setEditingArenaId(null);
        setShowArenaForm(false);
        fetchInitialData();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(`Failed to ${editingArenaId ? 'update' : 'create'} arena`);
    }
  };

  const openArenaForm = (arena?: Arena) => {
    if (arena) {
      setEditingArenaId(arena.id);
      setArenaName(arena.name);
      setArenaSlug(arena.slug);
      setArenaAddress(arena.address || '');
      setArenaCoverImage((arena as any).cover_image || '');
      setArenaLogoUrl((arena as any).logo_url || '');
    } else {
      setEditingArenaId(null);
      setArenaName('');
      setArenaSlug('');
      setArenaAddress('');
      setArenaCoverImage('');
      setArenaLogoUrl('');
    }
    setShowArenaForm(true);
  };

  const openAdminForm = (admin?: AdminUser) => {
    if (admin) {
      setEditingAdminId(admin.id);
      setAdminName(admin.first_name + ' ' + (admin.last_name || ''));
      setAdminEmail(admin.email);
      setAdminPassword('');
    } else {
      setEditingAdminId(null);
      setAdminName('');
      setAdminEmail('');
      setAdminPassword('');
    }
    setShowAdminForm(true);
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArenaId && !editingAdminId) return;
    setError('');
    setSuccess('');

    try {
      const url = editingAdminId 
        ? `/api/fg-admin/super-admin/admins/${editingAdminId}` 
        : '/api/fg-admin/super-admin/admins';
      const method = editingAdminId ? 'PUT' : 'POST';
      const bodyPayload: any = { name: adminName, email: adminEmail };
      if (!editingAdminId) bodyPayload.arena_id = selectedArenaId;
      if (adminPassword) bodyPayload.password = adminPassword;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });
      
      const data = await res.json();
      if (data.success) {
        if (editingAdminId) {
          setSuccess('Admin updated successfully!');
        } else {
          setSuccess(`Admin created! Temporary password: ${data.data.credentials.tempPassword}`);
        }
        setAdminName('');
        setAdminEmail('');
        setAdminPassword('');
        setEditingAdminId(null);
        setShowAdminForm(false);
        if (selectedArenaId) fetchArenaDetails(selectedArenaId);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(`Failed to ${editingAdminId ? 'update' : 'create'} admin`);
    }
  };

  const openSecurityForm = (security?: SecurityStaff) => {
    if (security) {
      setEditingSecurityId(security.id);
      setSecurityName(security.first_name + ' ' + (security.last_name || ''));
      setSecurityEmail(security.email);
      setSecurityPhone(security.phone || '');
      setSecurityPassword('');
    } else {
      setEditingSecurityId(null);
      setSecurityName('');
      setSecurityEmail('');
      setSecurityPhone('');
      setSecurityPassword('');
    }
    setShowSecurityForm(true);
  };

  const handleCreateSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArenaId && !editingSecurityId) return;
    setError('');
    setSuccess('');

    try {
      const url = editingSecurityId 
        ? `/api/fg-admin/super-admin/admins/${editingSecurityId}` 
        : '/api/fg-admin/super-admin/security';
      const method = editingSecurityId ? 'PUT' : 'POST';
      const bodyPayload: any = { name: securityName, email: securityEmail, phone: securityPhone };
      if (!editingSecurityId) bodyPayload.arena_id = selectedArenaId;
      if (securityPassword) bodyPayload.password = securityPassword;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });
      
      const data = await res.json();
      if (data.success) {
        if (editingSecurityId) {
          setSuccess('Security staff updated successfully!');
        } else {
          setSuccess(`Security staff created! Temporary password: ${data.data.credentials.tempPassword}`);
        }
        setSecurityName('');
        setSecurityEmail('');
        setSecurityPhone('');
        setSecurityPassword('');
        setEditingSecurityId(null);
        setShowSecurityForm(false);
        if (selectedArenaId) fetchArenaDetails(selectedArenaId);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(`Failed to ${editingSecurityId ? 'update' : 'create'} security staff`);
    }
  };

  const handleCreateTiming = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArenaId) return;
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/fg-admin/super-admin/arenas/timings', {
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
      const res = await fetch('/api/fg-admin/super-admin/bookings', {
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
      router.push('/fg-admin/login');
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
          <a href="/fg-admin/login" className="px-6 py-2 btn-primary rounded-full inline-block">
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
            
            <hr className="border-white/10 my-4" />
            
            <a href="/fg-admin/platform/audit-logs" className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors text-gray-400 hover:text-white hover:bg-white/5">
              <span className="material-symbols-outlined text-lg">history</span>
              Audit Logs
            </a>
            
            <a href="/fg-admin/platform/notifications" className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors text-gray-400 hover:text-white hover:bg-white/5">
              <span className="material-symbols-outlined text-lg">notifications</span>
              Notifications
            </a>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-card relative overflow-hidden group">
                  <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
                  <div className="relative">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2 flex items-center justify-between">
                      Total Bookings
                      <span className="material-symbols-outlined text-primary text-sm">calendar_month</span>
                    </p>
                    <p className="text-4xl font-black italic text-white">{stats?.totalBookings || 0}</p>
                    <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[10px]">trending_up</span> Overall Success
                    </p>
                  </div>
                </div>

                <div className="glass-card relative overflow-hidden group">
                  <div className="absolute inset-0 bg-green-500/5 group-hover:bg-green-500/10 transition-colors" />
                  <div className="relative">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2 flex items-center justify-between">
                      Total Revenue
                      <span className="material-symbols-outlined text-green-400 text-sm">payments</span>
                    </p>
                    <p className="text-4xl font-black italic text-white flex items-baseline gap-1">
                      <span className="text-2xl text-green-400">₹</span>
                      {(stats?.totalRevenue || 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest mt-2">
                      Gross Collected
                    </p>
                  </div>
                </div>

                <div className="glass-card relative overflow-hidden group">
                  <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
                  <div className="relative">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2 flex items-center justify-between">
                      Unique Customers
                      <span className="material-symbols-outlined text-blue-400 text-sm">group</span>
                    </p>
                    <p className="text-4xl font-black italic text-white">{stats?.totalCustomers || 0}</p>
                    <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-2">
                      Verified Contacts
                    </p>
                  </div>
                </div>

                <div className="glass-card relative overflow-hidden group">
                  <div className="absolute inset-0 bg-purple-500/5 group-hover:bg-purple-500/10 transition-colors" />
                  <div className="relative">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2 flex items-center justify-between">
                      Platform Arenas
                      <span className="material-symbols-outlined text-purple-400 text-sm">stadium</span>
                    </p>
                    <p className="text-4xl font-black italic text-white">{safeArenas?.length || 0}</p>
                    <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mt-2 flex gap-2">
                      <span>{stats?.totalAdmins || 0} Admins</span>
                      <span>•</span>
                      <span>{stats?.totalSecurity || 0} Security</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div className="glass-card col-span-1 md:col-span-2">
                  <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500 mb-4">Platform Growth (Illustrative)</h3>
                  <div className="h-48 flex items-end justify-between gap-2 px-2">
                    {[30, 45, 25, 60, 75, 40, 85].map((h, i) => (
                      <div key={i} className="w-full bg-primary/20 hover:bg-primary/50 transition-colors rounded-t-sm relative group" style={{ height: `${h}%` }}>
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-white bg-black/80 px-2 py-1 rounded">
                          +{h}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-2 px-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                    <span>Sun</span>
                  </div>
                </div>

                <div className="glass-card">
                  <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500 mb-4">System Status</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-widest text-white">Payment Gateway</p>
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-[10px] font-black uppercase rounded-full flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Online
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-widest text-white">Database</p>
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-[10px] font-black uppercase rounded-full flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Online
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-widest text-white">Account Email</p>
                      <p className="text-[10px] font-bold text-gray-400 truncate max-w-[120px]">{settings.email}</p>
                    </div>
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
                  onClick={() => openArenaForm()}
                  className="btn-primary text-xs"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  CREATE ARENA
                </button>
              </div>

              {/* Arena Creation Modal/Form */}
              {showArenaForm && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="glass-card w-full max-w-md max-h-[90vh] overflow-y-auto">
                    <h3 className="text-xl font-black italic uppercase mb-6">{editingArenaId ? 'Edit' : 'Create New'} <span className="text-primary">Arena</span></h3>
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
                      <div>
                        <label className="label-classic">Cover Image URL</label>
                        <input 
                          className="input-field" 
                          value={arenaCoverImage} 
                          onChange={e => setArenaCoverImage(e.target.value)}
                          placeholder="https://example.com/cover.jpg"
                        />
                      </div>
                      <div>
                        <label className="label-classic">Logo URL</label>
                        <input 
                          className="input-field" 
                          value={arenaLogoUrl} 
                          onChange={e => setArenaLogoUrl(e.target.value)}
                          placeholder="https://example.com/logo.png"
                        />
                      </div>
                      <div className="flex gap-4 pt-4">
                        <button type="submit" className="btn-primary flex-1">{editingArenaId ? 'UPDATE' : 'CREATE'}</button>
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
                      <div
                        key={arena.id}
                        onClick={() => setSelectedArenaId(arena.id)}
                        className={`w-full glass-card !p-4 transition-all flex flex-col cursor-pointer ${
                          selectedArenaId === arena.id ? 'border-primary bg-primary/5' : 'hover:border-white/20'
                        }`}
                      >
                        <div className="flex justify-between items-start w-full">
                          <div className="text-left">
                            <h4 className="font-bold uppercase italic tracking-tight">{arena.name}</h4>
                            <p className="text-[10px] text-gray-500 font-bold tracking-widest">{arena.slug}</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); openArenaForm(arena); }}
                            className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                          </button>
                        </div>
                      </div>
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
                          <button onClick={() => openAdminForm()} className="text-xs font-bold uppercase tracking-widest text-primary hover:text-white transition-colors">
                            + ADD ADMIN
                          </button>
                        </div>

                        {showAdminForm && (
                          <div className="glass-card !bg-white/5 border-primary/30">
                            <h4 className="text-sm font-bold uppercase mb-4">{editingAdminId ? 'Edit Admin' : 'New Admin'}</h4>
                            <form onSubmit={handleCreateAdmin} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              <input 
                                className="input-field" 
                                type="password"
                                value={adminPassword} 
                                onChange={e => setAdminPassword(e.target.value)}
                                placeholder={editingAdminId ? "New Password (optional)" : "Password (auto-generated if empty)"}
                              />
                              <div className="flex gap-2">
                                <button type="submit" className="btn-primary flex-1 !py-0">{editingAdminId ? 'UPDATE' : 'ADD'}</button>
                                <button type="button" onClick={() => setShowAdminForm(false)} className="btn-secondary !py-0">X</button>
                              </div>
                            </form>
                          </div>
                        )}

                        <div className="grid gap-3">
                          {safeAdmins.map(admin => (
                            <div key={admin.id} className="glass-card !p-4 flex items-center justify-between group hover:border-white/20 transition-all">
                              <div>
                                <p className="font-bold uppercase italic tracking-tight">{admin.first_name} {admin.last_name}</p>
                                <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">{admin.email}</p>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${admin.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                  {admin.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); openAdminForm(admin); }}
                                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-primary/20 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <span className="material-symbols-outlined text-[14px]">edit</span>
                                </button>
                                <button
                                  onClick={() => handleRemoveAdmin(admin.id)}
                                  className="w-8 h-8 flex items-center justify-center rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <span className="material-symbols-outlined text-[14px]">delete</span>
                                </button>
                              </div>
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
                          <button onClick={() => openSecurityForm()} className="text-xs font-bold uppercase tracking-widest text-primary hover:text-white transition-colors">
                            + ADD SECURITY
                          </button>
                        </div>

                        {showSecurityForm && (
                          <div className="glass-card !bg-white/5 border-primary/30">
                            <h4 className="text-sm font-bold uppercase mb-4">{editingSecurityId ? 'Edit Security' : 'New Security'}</h4>
                            <form onSubmit={handleCreateSecurity} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                placeholder="Email Address"
                                required
                              />
                              <input 
                                className="input-field" 
                                type="tel"
                                value={securityPhone} 
                                onChange={e => setSecurityPhone(e.target.value)}
                                placeholder="Phone Number"
                              />
                              <input 
                                className="input-field" 
                                type="password"
                                value={securityPassword} 
                                onChange={e => setSecurityPassword(e.target.value)}
                                placeholder={editingSecurityId ? "New Password (optional)" : "Password (auto-generated if empty)"}
                              />
                              <div className="flex gap-2 md:col-span-2">
                                <button type="submit" className="btn-primary flex-1 !py-0">{editingSecurityId ? 'UPDATE' : 'ADD'}</button>
                                <button type="button" onClick={() => setShowSecurityForm(false)} className="btn-secondary !py-0">X</button>
                              </div>
                            </form>
                          </div>
                        )}

                        <div className="grid gap-3">
                          {safeSecurity.map(staff => (
                            <div key={staff.id} className="glass-card !p-4 flex items-center justify-between group hover:border-white/20 transition-all">
                              <div>
                                <p className="font-bold uppercase italic tracking-tight">{staff.first_name} {staff.last_name}</p>
                                <div className="flex gap-3">
                                  <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">{staff.email}</p>
                                  {staff.phone && <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">{staff.phone}</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${staff.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                  {staff.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); openSecurityForm(staff); }}
                                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-primary/20 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <span className="material-symbols-outlined text-[14px]">edit</span>
                                </button>
                                <button
                                  onClick={() => handleRemoveSecurity(staff.id)}
                                  className="w-8 h-8 flex items-center justify-center rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <span className="material-symbols-outlined text-[14px]">delete</span>
                                </button>
                              </div>
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
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold italic tracking-tighter uppercase">Approval <span className="text-primary">Requests</span></h2>
                  <p className="text-gray-400 text-xs mt-1 uppercase tracking-widest">Manage pending requests from Arena Admins</p>
                </div>
                <button onClick={fetchApprovals} className="btn-secondary !py-2 !px-4 !rounded-xl text-[10px]">REFRESH</button>
              </div>

              {approvalsLoading ? (
                <div className="text-center py-12 text-gray-400">Loading...</div>
              ) : approvals.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <span className="material-symbols-outlined text-4xl mb-4 block">check_circle</span>
                  <p className="text-sm uppercase tracking-widest font-bold">No pending requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {approvals.map(req => (
                    <div key={req.id} className="glass-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs font-bold bg-primary/20 text-primary px-2 py-1 rounded border border-primary/30 uppercase tracking-widest">
                            {req.request_type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] text-gray-400 uppercase tracking-widest">
                            {new Date(req.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-white text-sm font-semibold mb-1">Requested by Admin #{req.requested_by}</p>
                        <p className="text-gray-400 text-xs italic">{req.notes || 'No notes provided.'}</p>
                        <div className="mt-4 bg-black/20 p-3 rounded text-xs font-mono text-gray-300 break-all">
                          {req.payload_json}
                        </div>
                      </div>
                      <div className="flex gap-3 w-full md:w-auto">
                        <button 
                          onClick={() => handleResolveRequest(req.id, 'approved')} 
                          className="flex-1 md:flex-none px-6 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded font-bold uppercase tracking-widest hover:bg-green-500/40 transition-colors"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleResolveRequest(req.id, 'rejected')} 
                          className="flex-1 md:flex-none px-6 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded font-bold uppercase tracking-widest hover:bg-red-500/40 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
