import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased bg-canvas text-ink">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
