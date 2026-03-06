import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';

import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider } from './providers/AuthProvider';

import './globals.css';

export const metadata: Metadata = {
  title: 'Sibneuro',
  description: 'AI Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="dark">
      <body className={GeistSans.className}>
        <AuthProvider>
          <QueryProvider>{children}</QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
