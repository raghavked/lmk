import type { Metadata, Viewport } from 'next';
import './globals.css';
import { MobileProvider } from '@/components/MobileProvider';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'LMK - Personalized Recommendations',
  description: 'Discover personalized recommendations tailored to your taste',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#0D1117" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className="bg-[background-primary] text-[text-primary]" suppressHydrationWarning>
        <MobileProvider>
          {children}
        </MobileProvider>
      </body>
    </html>
  );
}
