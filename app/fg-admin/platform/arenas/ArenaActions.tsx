'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ArenaActions({ arenaId, status }: { arenaId: number, status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggleStatus() {
    if (!confirm(`Are you sure you want to ${status === 'active' ? 'disable' : 'enable'} this arena?`)) return;
    setLoading(true);
    try {
      await fetch(`/api/fg-admin/platform/arenas/${arenaId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: status === 'active' ? 'disabled' : 'active' })
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you absolutely sure you want to delete this arena? This cannot be undone easily.')) return;
    setLoading(true);
    try {
      await fetch(`/api/fg-admin/platform/arenas/${arenaId}/status`, {
        method: 'DELETE'
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2 ml-4 border-l border-white/10 pl-4">
      <button 
        onClick={handleToggleStatus} 
        disabled={loading}
        className="btn-secondary !py-3 !px-4 !rounded-xl text-xs flex gap-2 items-center"
        title={status === 'active' ? 'Disable Arena' : 'Enable Arena'}
      >
        <span className="material-symbols-outlined text-sm">{status === 'active' ? 'block' : 'check_circle'}</span>
        {status === 'active' ? 'Disable' : 'Enable'}
      </button>
      <button 
        onClick={handleDelete} 
        disabled={loading}
        className="bg-red-500/10 hover:bg-red-500/20 text-red-500 !py-3 !px-4 !rounded-xl text-xs flex gap-2 items-center transition-colors disabled:opacity-50"
        title="Delete Arena"
      >
        <span className="material-symbols-outlined text-sm">delete</span>
        Delete
      </button>
    </div>
  );
}
