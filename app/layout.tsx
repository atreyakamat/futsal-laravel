import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import '@/lib/env-validate';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { readAuthUserId, readAuthRole, readArenaId } from '@/lib/session';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'FutsalGoa | Premium Turf Booking',
  description: 'Book the best futsal turfs in Goa instantly.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const userId = await readAuthUserId();
  const role = await readAuthRole();
  const arenaId = await readArenaId();

  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=block"
        />
      </head>
      <body className={spaceGrotesk.className}>
        <Header userId={userId} role={role} arenaId={arenaId} />
        {children}
        <Footer />
      </body>
    </html>
  );
}
