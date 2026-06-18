import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="bg-dark text-white flex items-center justify-center min-h-screen font-sans">
      <div className="glass-card text-center max-w-sm">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-8 border border-primary/20">
          <span className="material-symbols-outlined text-4xl text-primary">search_off</span>
        </div>
        <h2 className="text-4xl font-black mb-4 uppercase italic">404 - Not Found</h2>
        <p className="text-white/40 mb-10 text-sm">The page you are looking for does not exist or has been moved.</p>
        <Link href="/" className="btn-primary inline-block">Return Home</Link>
      </div>
    </div>
  );
}
