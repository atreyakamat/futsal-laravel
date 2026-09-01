'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type ChangeSlotsLinkProps = {
  arenaSlug: string;
  arenaId: number;
  date: string;
  csrfToken: string;
};

/**
 * Lets a customer go back and pick different slots without losing their
 * place — previously the only way to change a selection mid-checkout was to
 * navigate all the way back to the homepage and re-pick the turf and date
 * from scratch. Releases the currently-held slot lock first (best-effort;
 * it would otherwise sit locked for up to its own 10-minute expiry even
 * though this customer is no longer trying to book it) then returns to the
 * same arena with the same date pre-selected, matching how the arena page
 * already reads `?date=` (see app/arena/[slug]/page.tsx's `selectedDate`).
 */
export default function ChangeSlotsLink({ arenaSlug, arenaId, date, csrfToken }: ChangeSlotsLinkProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    setPending(true);
    try {
      await fetch('/api/slots/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ arena_id: arenaId, date }),
      });
    } catch (e) {
      console.error('Failed to release slot lock before changing selection:', e);
    } finally {
      router.push(`/arena/${arenaSlug}?date=${date}`);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
    >
      <span className="material-symbols-outlined text-sm">edit</span>
      {pending ? 'Loading...' : 'Change Slots'}
    </button>
  );
}
