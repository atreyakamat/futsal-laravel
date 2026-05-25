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
        router.push('/dashboard'); // Or a dedicated admin arena list
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
    <div className="max-w-2xl mx-auto p-10 glass rounded-[2.5rem] border border-white/10 shadow-2xl shadow-black/50">
      <h2 className="text-3xl font-black mb-8 uppercase tracking-tighter italic">
        Create <span className="text-primary">New Arena</span>
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Arena Name</label>
          <input
            type="text"
            required
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-primary transition-all"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Slug</label>
          <input
            type="text"
            required
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-primary transition-all"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="pilar-arena"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Address</label>
          <input
            type="text"
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-primary transition-all"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-5 rounded-2xl font-black text-sm tracking-widest bg-primary text-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20"
        >
          {loading ? 'Creating...' : 'CREATE ARENA'}
        </button>
      </form>
    </div>
  );
}
