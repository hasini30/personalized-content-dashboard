import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProviders } from '@/components/providers/AppProviders';

export const viewport: Viewport = {
  themeColor: '#2563eb',
};

export const metadata: Metadata = {
  title: 'FeedPulse - Personalized Content Dashboard',
  description:
    'A unified, personalized feed of real-time news, movie recommendations, and social updates.',
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <a
          href="#main-content"
          style={{ position: 'fixed', top: -9999, left: -9999 }}
          className="sr-only focus:not-sr-only focus:!top-4 focus:!left-4 z-50 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-md shadow-lg outline-none ring-2 ring-ring"
        >
          Skip to main content
        </a>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
