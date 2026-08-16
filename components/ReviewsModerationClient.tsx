'use client';

import { useState, useEffect, useCallback } from 'react';

interface Review {
  id: number;
  arena_name: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  status: string;
  created_at: string;
}

export default function ReviewsModerationClient() {
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/fg-admin/super-admin/reviews?status=${tab}`);
    const data = await res.json();
    if (data.success) setReviews(data.data || []);
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const decide = async (reviewId: number, decision: 'approved' | 'rejected') => {
    setMessage('');
    const res = await fetch('/api/fg-admin/super-admin/reviews', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewId, decision }),
    });
    const data = await res.json();
    if (data.success) {
      setMessage(data.message);
      refresh();
    } else {
      setMessage(data.message || 'Failed to update review');
    }
  };

  const remove = async (reviewId: number) => {
    if (!confirm('Delete this review permanently?')) return;
    const res = await fetch(`/api/fg-admin/super-admin/reviews?id=${reviewId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      setMessage(data.message);
      refresh();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-20 space-y-8">
      <div>
        <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
          Reviews <span className="text-primary text-stroke">Moderation</span>
        </h1>
        <p className="label-classic !ml-0">Approve, reject, or remove customer reviews per turf</p>
      </div>

      <div className="flex gap-3">
        {(['pending', 'approved', 'rejected'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`btn-secondary !py-2 !px-4 !rounded-lg text-[10px] ${tab === t ? '!border-primary !text-primary' : ''}`}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {message && <div className="px-4 py-3 rounded-xl border border-primary/20 bg-primary/5 text-primary text-xs font-bold">{message}</div>}

      {loading ? (
        <p className="text-white/30 text-xs uppercase font-bold tracking-widest">Loading...</p>
      ) : reviews.length === 0 ? (
        <p className="text-white/30 text-xs uppercase font-bold tracking-widest">No {tab} reviews.</p>
      ) : (
        <div className="grid gap-4">
          {reviews.map((r) => (
            <div key={r.id} className="glass-card !p-6 flex flex-col md:flex-row justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="font-black uppercase italic">{r.arena_name}</span>
                  <span className="text-primary font-black text-sm">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                </div>
                <p className="text-xs text-white/40">by {r.customer_name} · {new Date(r.created_at).toLocaleDateString('en-GB')}</p>
                {r.comment && <p className="text-sm text-white/70 mt-2">{r.comment}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                {tab === 'pending' && (
                  <>
                    <button onClick={() => decide(r.id, 'approved')} className="btn-primary !py-2 !px-4 text-[10px]">APPROVE</button>
                    <button onClick={() => decide(r.id, 'rejected')} className="btn-secondary !py-2 !px-4 text-[10px] !border-red-500/30 !text-red-400">REJECT</button>
                  </>
                )}
                {tab === 'approved' && (
                  <button onClick={() => remove(r.id)} className="btn-secondary !py-2 !px-4 text-[10px] !border-red-500/30 !text-red-400">DELETE</button>
                )}
                {tab === 'rejected' && (
                  <button onClick={() => decide(r.id, 'approved')} className="btn-secondary !py-2 !px-4 text-[10px]">APPROVE INSTEAD</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
