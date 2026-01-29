import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LMK - Personalized Recommendations',
  description: 'Discover personalized recommendations tailored to your taste',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
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
        <meta name="theme-color" content="#000000" />
      </head>
      <body className="bg-gray-50">
        {children}
      </body>
    </html>
  );
}
