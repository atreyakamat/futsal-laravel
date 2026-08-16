'use client';

import { useState } from 'react';

interface ReviewItem {
  id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  customer_name?: string;
}

interface Props {
  arenaId: number;
  aggregate: { average: number; count: number };
  reviews: ReviewItem[];
  isLoggedIn: boolean;
  canReview: boolean;
  existingReview: { rating: number; comment: string | null; status: string } | null;
}

function Stars({ value, size = 'text-base' }: { value: number; size?: string }) {
  return (
    <span className={`inline-flex ${size} text-primary`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className="material-symbols-outlined" style={{ fontVariationSettings: n <= Math.round(value) ? "'FILL' 1" : "'FILL' 0" }}>
          star
        </span>
      ))}
    </span>
  );
}

export default function TurfReviews({ arenaId, aggregate, reviews, isLoggedIn, canReview, existingReview }: Props) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) {
      setError('Please select a star rating.');
      return;
    }
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`/api/arena/${arenaId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: comment.trim() || null }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(data.message);
        setSubmitted(true);
      } else {
        setError(data.message || 'Failed to submit review.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight italic">
          Reviews {aggregate.count > 0 && <span className="text-primary text-stroke">({aggregate.count})</span>}
        </h2>
        {aggregate.count > 0 && (
          <div className="flex items-center gap-3">
            <Stars value={aggregate.average} size="text-xl" />
            <span className="text-2xl font-black text-white">{aggregate.average.toFixed(1)}</span>
          </div>
        )}
      </div>

      {reviews.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {reviews.map((r) => (
            <div key={r.id} className="glass-card !p-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black uppercase italic text-sm">{r.customer_name || 'Player'}</span>
                <Stars value={r.rating} />
              </div>
              {r.comment && <p className="text-sm text-white/60">{r.comment}</p>}
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
                {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-white/30 text-sm">No reviews yet — be the first to play here and leave one.</p>
      )}

      <div className="glass-card !p-6 sm:!p-8 max-w-xl">
        {!isLoggedIn ? (
          <p className="text-sm text-white/50">Log in and book a session here to leave a review.</p>
        ) : !canReview ? (
          <p className="text-sm text-white/50">Only customers with a confirmed booking at this turf can leave a review.</p>
        ) : submitted ? (
          <p className="text-sm text-primary font-bold">{message}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-black uppercase italic">
              {existingReview ? 'Update Your Review' : 'Write a Review'}
            </h3>
            {existingReview?.status === 'pending' && (
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Your current review is pending approval.</p>
            )}
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className="text-3xl text-primary"
                >
                  <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: n <= rating ? "'FILL' 1" : "'FILL' 0" }}>
                    star
                  </span>
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Share your experience (optional)"
              className="input-field"
            />
            {error && <p className="text-red-400 text-xs font-bold">{error}</p>}
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'SUBMITTING...' : existingReview ? 'UPDATE REVIEW' : 'SUBMIT REVIEW'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
