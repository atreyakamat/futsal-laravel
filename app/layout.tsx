import type { Metadata } from 'next';
import { Space_Grotesk, IBM_Plex_Sans } from 'next/font/google';
import './globals.css';

const displayFont = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

const bodyFont = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'FutsalGoa',
  description: 'Arena booking, payments, tickets, and security verification.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body>
        <div className="shell">
          <header className="topbar">
            <a className="brand" href="/">
              <strong>FutsalGoa</strong>
              <span className="meta">Next.js migration on MySQL</span>
            </a>
            <nav className="actions">
              <a className="button-secondary" href="/login">
                Login
              </a>
              <a className="button-secondary" href="/security/scan">
                Security
              </a>
              <a className="button-secondary" href="/admin">
                Admin
              </a>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}