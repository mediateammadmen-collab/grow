import type { Metadata, Viewport } from 'next';
import { GrowProvider } from '@/lib/store';
import './globals.css';

export const metadata: Metadata = {
  title: 'Grow: Money Tracker',
  description: 'Grow tracks your income and spending, follows your portfolio and answers your money questions.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icons/favicon-32.png', apple: '/icons/apple-touch-icon.png' },
  openGraph: { title: 'Grow: Money Tracker', description: 'Track money, plan budgets, follow your portfolio and get money guidance.', type: 'website' },
};
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, viewportFit: 'cover',
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#f2f6f3' }, { media: '(prefers-color-scheme: dark)', color: '#0c1511' }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <GrowProvider>{children}</GrowProvider>
      </body>
    </html>
  );
}
