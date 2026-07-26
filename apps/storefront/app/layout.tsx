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
    default: 'PrintCraft — Premium Photo Prints & Frames',
    template: '%s | PrintCraft',
  },
  description: 'Turn your memories into premium wall art. Custom photo prints, framed photos, and posters delivered across India.',
  keywords: ['photo prints', 'framed photos', 'custom prints', 'wall art', 'photo frames', 'India'],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'PrintCraft',
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
