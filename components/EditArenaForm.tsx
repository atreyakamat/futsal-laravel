'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EditArenaForm({ arena }: { arena: any }) {
  const [formData, setFormData] = useState({
    name: arena.name || '',
    address: arena.address || '',
    cover_image: arena.cover_image || '',
    logo_url: arena.logo_url || '',
    status: arena.status || 'active',
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/super-admin/arenas/${arena.id}`, {
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
          <label className="label-classic">Address</label>
          <input
            type="text"
            className="input-field"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
