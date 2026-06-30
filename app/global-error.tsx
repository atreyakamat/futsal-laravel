'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global layout error caught:', error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <title>System Error | AgnelArena</title>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=block"
        />
      </head>
      <body className="bg-dark text-white flex items-center justify-center min-h-screen p-6 font-sans">
        <div className="glass-card text-center max-w-md w-full !p-10 border border-white/10 rounded-[2.5rem] shadow-2xl">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-8 border border-red-500/20">
            <span className="material-symbols-outlined text-4xl text-red-500">error</span>
          </div>
          <h2 className="text-3xl font-black uppercase italic mb-4 tracking-tighter">Critical System Error</h2>
          <p className="text-white/40 text-sm leading-relaxed mb-10">
            A critical layout or template issue occurred. The application is attempting to restore state.
          </p>
          <button
            onClick={() => reset()}
            className="btn-primary w-full cursor-pointer !py-4 rounded-2xl"
          >
            Restore Session
          </button>
        </div>
      </body>
    </html>
  );
}
