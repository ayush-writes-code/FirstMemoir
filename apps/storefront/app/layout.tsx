import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'First Memoir — Premium Photo Prints & Frames',
    template: '%s | First Memoir',
  },
  description: 'Custom photo prints, framed photos, and premium posters. Crafted with care, delivered across India.',
  metadataBase: new URL('http://localhost:3000'), // Change in production
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: '/',
    siteName: 'First Memoir',
  },
};

import { AuthProvider } from '@/store/auth.context';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans antialiased bg-canvas text-ink">
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
