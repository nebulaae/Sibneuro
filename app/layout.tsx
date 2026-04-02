import Script from 'next/script';
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';

import { TelegramProvider } from './providers/TelegramProvider';
import { MaxProvider } from './providers/MaxProvider';
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
        {/* Telegram WebApp SDK */}
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://mini-apps.max.ru/sdk.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className={GeistSans.className}>
        <AuthProvider>
          <TelegramProvider>
            <MaxProvider>
              <QueryProvider>{children}</QueryProvider>
            </MaxProvider>
          </TelegramProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
