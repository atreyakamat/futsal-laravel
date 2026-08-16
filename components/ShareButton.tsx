'use client';

import { useState } from 'react';

interface Props {
  title: string;
  text: string;
  className?: string;
}

export default function ShareButton({ title, text, className }: Props) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // User cancelled the share sheet — not an error.
      }
      return;
    }
    // No Web Share API (desktop browsers mostly) — fall back to clipboard.
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — nothing more we can do silently.
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={className || 'btn-secondary !py-3 !px-5 !rounded-full inline-flex items-center gap-2'}
    >
      <span className="material-symbols-outlined text-lg">{copied ? 'check' : 'share'}</span>
      {copied ? 'Link Copied' : 'Share'}
    </button>
  );
}
