export const dynamic = 'force-dynamic';
import type { Metadata, Viewport } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import '@/lib/env-validate';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FloatingContact from '@/components/FloatingContact';
import { readAuthUserId, readAuthRole, readArenaId } from '@/lib/session';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    template: '%s | AgnelArena',
    default: 'AgnelArena | Premium Turf Booking',
  },
  description: 'Book the best agnel turfs in Goa instantly. Secure your pitch with our streamlined booking engine.',
  keywords: ['agnel', 'goa', 'turf booking', 'football', 'sports arena'],
  authors: [{ name: 'AgnelArena' }],
  creator: 'AgnelArena',
  openGraph: {
    title: 'AgnelArena | Premium Turf Booking',
    description: 'Book the best agnel turfs in Goa instantly.',
    url: 'https://agnelarena.com',
    siteName: 'AgnelArena',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgnelArena | Premium Turf Booking',
    description: 'Book the best agnel turfs in Goa instantly.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0F172A',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let userId: number | null = null;
  let role: string | null = null;
  let arenaId: number | null = null;

  let userName: string | null = null;

  try {
    userId = await readAuthUserId();
    role = await readAuthRole();
    arenaId = await readArenaId();
    
    if (userId) {
      const { findUserById } = await import('@/lib/domain');
      const user = await findUserById(userId);
      if (user) {
        userName = user.name;
      }
    }
  } catch (e) {
    console.error('Failed to read session cookies in layout:', e);
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=block"
        />
      </head>
      <body className={spaceGrotesk.className}>
        <Header userId={userId} role={role} arenaId={arenaId} userName={userName} />
        {children}
        <FloatingContact />
        <Footer />
      </body>
    </html>
  );
}
