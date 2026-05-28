'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateArenaForm() {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    address: '',
    status: 'active' as 'active' | 'inactive',
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/arenas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('Arena created successfully!');
        router.push('/admin/arenas');
        router.refresh();
      } else {
        alert('Failed to create arena.');
      }
    } catch (e) {
      alert('Error creating arena.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-12 glass-card">
      <h2 className="text-4xl font-black mb-10 uppercase tracking-tighter italic">
        Create <span className="text-primary text-stroke">New Arena</span>
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
            required
            className="input-field"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="pilar-arena"
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
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-6 mt-4"
        >
          {loading ? 'Creating...' : 'CREATE ARENA'}
        </button>
      </form>
    </div>
  );
}
