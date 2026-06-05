import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,   // prevent iOS zoom on input tap
  themeColor: '#D97757',
};

export const metadata: Metadata = {
  title: 'Stock Tracker',
  description: 'Live prices, PE ratios, earnings dates and top news for the stocks you follow — all in one place.',
  openGraph: {
    title: 'Stock Tracker',
    description: 'Live prices, PE ratios, earnings dates and top news for the stocks you follow.',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Stock Tracker',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stock Tracker',
    description: 'Live prices, PE ratios, earnings and news for stocks you follow.',
    images: ['/og-image.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Stock Tracker',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
