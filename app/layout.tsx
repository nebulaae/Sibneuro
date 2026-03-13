import Script from 'next/script';
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';

import { TelegramProvider } from './providers/TelegramProvider';
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
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>

      <body className={GeistSans.className}>
        <AuthProvider>
          <TelegramProvider>
            <QueryProvider>{children}</QueryProvider>
          </TelegramProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
