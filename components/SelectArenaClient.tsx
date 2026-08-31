'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SelectArenaClient({ arenas }: { arenas: { id: number; name: string; slug: string }[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  async function selectArena(arenaId: number) {
    setLoadingId(arenaId);
    setError('');
    try {
      const res = await fetch('/api/fg-admin/select-arena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arena_id: arenaId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        router.push('/fg-admin/arena/dashboard');
      } else {
        setError(data.message || 'Failed to select turf');
        setLoadingId(null);
      }
    } catch {
      setError('An error occurred');
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-red-400 text-sm font-bold">{error}</p>
      )}
      {arenas.map((arena) => (
        <button
          key={arena.id}
          onClick={() => selectArena(arena.id)}
          disabled={loadingId !== null}
          className="w-full flex items-center justify-between p-6 rounded-2xl border border-white/10 bg-white/[0.02] hover:border-primary/40 hover:bg-primary/5 transition-colors text-left disabled:opacity-50"
        >
          <span className="text-lg font-black uppercase italic">{arena.name}</span>
          <span className="material-symbols-outlined text-primary">
            {loadingId === arena.id ? 'progress_activity' : 'arrow_forward'}
          </span>
        </button>
      ))}
    </div>
  );
}
