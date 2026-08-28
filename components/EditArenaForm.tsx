'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EditArenaForm({ arena }: { arena: any }) {
  const [formData, setFormData] = useState({
    name: arena.name || '',
    slug: arena.slug || '',
    address: arena.address || '',
    contact_phone: arena.contact_phone || '',
    whatsapp_number: arena.whatsapp_number || '',
    gmaps_link: arena.gmaps_link || '',
    cover_image: arena.cover_image || '',
    logo_url: arena.logo_url || '',
    status: arena.status || 'active',
    payment_mode: arena.payment_mode || 'online',
    upi_vpa: arena.upi_vpa || '',
    gst_place_of_supply: arena.gst_place_of_supply || '',
    customer_refund_enabled: Boolean(arena.customer_refund_enabled),
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/fg-admin/super-admin/arenas/${arena.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('Arena updated successfully!');
        router.push('/fg-admin/platform/arenas');
        router.refresh();
      } else {
        alert('Failed to update arena.');
      }
    } catch (e) {
      alert('Error updating arena.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-12 glass-card">
      <h2 className="text-4xl font-black mb-10 uppercase tracking-tighter italic">
        Edit <span className="text-primary text-stroke">Arena</span>
      </h2>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-3">
          <label className="label-classic">Arena Name</label>
          <input
            type="text"
            required
            className="input-field"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="space-y-3">
          <label className="label-classic">Slug</label>
          <input
            type="text"
            className="input-field"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="used in the turf's public URL, e.g. /arena/your-slug"
          />
        </div>
        <div className="space-y-3">
          <label className="label-classic">Address</label>
          <input
            type="text"
            className="input-field"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
        </div>
        <div className="space-y-3">
          <label className="label-classic">Google Maps Link</label>
          <input
            type="url"
            className="input-field"
            value={formData.gmaps_link}
            onChange={(e) => setFormData({ ...formData, gmaps_link: e.target.value })}
            placeholder="https://maps.app.goo.gl/..."
          />
        </div>
        <div className="space-y-3">
          <label className="label-classic">Contact Phone</label>
          <input
            type="tel"
            className="input-field"
            value={formData.contact_phone}
            onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
          />
        </div>
        <div className="space-y-3">
          <label className="label-classic">WhatsApp Number</label>
          <input
            type="tel"
            className="input-field"
            value={formData.whatsapp_number}
            onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
            placeholder="+91..."
          />
        </div>
        <div className="space-y-3">
          <label className="label-classic">Cover Image URL</label>
          <input
            type="url"
            className="input-field"
            value={formData.cover_image}
            onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
            placeholder="https://example.com/cover.jpg"
          />
        </div>
        <div className="space-y-3">
          <label className="label-classic">Logo URL</label>
          <input
            type="url"
            className="input-field"
            value={formData.logo_url}
            onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
            placeholder="https://example.com/logo.png"
          />
        </div>
        <div className="space-y-3">
          <label className="label-classic">Status</label>
          <select
            className="input-field"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="space-y-3">
          <label className="label-classic">Payment Mode</label>
          <select
            className="input-field"
            value={formData.payment_mode}
            onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value as 'online' | 'offline' })}
          >
            <option value="online">Online (PayU at checkout)</option>
            <option value="offline">Offline (pay at venue via UPI)</option>
          </select>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
            Offline mode reserves the slot immediately and lets players pay at the venue; staff confirm payment afterward.
          </p>
        </div>
        {formData.payment_mode === 'offline' && (
          <div className="space-y-3">
            <label className="label-classic">Venue UPI ID (VPA)</label>
            <input
              type="text"
              className="input-field"
              value={formData.upi_vpa}
              onChange={(e) => setFormData({ ...formData, upi_vpa: e.target.value })}
              placeholder="arenaname@upi"
            />
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
              Used to generate the QR code players scan to pay at the venue.
            </p>
          </div>
        )}
        <div className="space-y-3 p-4 rounded-xl border border-white/10 bg-white/[0.02]">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.customer_refund_enabled}
              onChange={(e) => setFormData({ ...formData, customer_refund_enabled: e.target.checked })}
              className="w-4 h-4 accent-primary"
            />
            <span className="label-classic !ml-0">Allow customer self-service refunds</span>
          </label>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
            On by default — cancellations are refund-eligible up to the cancellation cutoff and through the end of the invoice month. Turning this off means cancellations at this arena are never refunded. Force refunds by super admin / arena admin always remain available regardless of this setting.
          </p>
        </div>
        <div className="space-y-3">
          <label className="label-classic">GST Place of Supply (State)</label>
          <input
            type="text"
            className="input-field"
            value={formData.gst_place_of_supply}
            onChange={(e) => setFormData({ ...formData, gst_place_of_supply: e.target.value })}
            placeholder="e.g. Goa"
          />
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
            Required before any Tax Invoice can be issued for this turf — determined by where the turf is physically located, not the trust's registered address.
          </p>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-6 mt-4"
        >
          {loading ? 'Updating...' : 'SAVE CHANGES'}
        </button>
      </form>
    </div>
  );
}
