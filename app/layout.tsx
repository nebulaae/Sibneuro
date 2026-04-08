import Script from 'next/script';
import type { Metadata } from 'next';
import { Toaster } from 'sonner';
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
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://mini-apps.max.ru/sdk.js"
          strategy="beforeInteractive"
        />
        {/* Viewport для iOS safe areas */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
      </head>
      {/*
        body: никакого background — он задаётся через var(--page-bg) в globals.css
        Это позволяет glass-материалам работать корректно.
      */}
      <body style={{ fontFamily: 'var(--font-sf)', margin: 0 }}>
        <AuthProvider>
          <TelegramProvider>
            <MaxProvider>
              <QueryProvider>{children}</QueryProvider>
              <Toaster
                position="top-center"
                toastOptions={{
                  style: {
                    background: 'var(--glass-thick)',
                    backdropFilter: 'blur(50px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(50px) saturate(180%)',
                    border: 'var(--glass-border-thick)',
                    boxShadow:
                      'inset 0 1px 0 rgba(255,255,255,0.2), 0 8px 32px rgba(0,0,0,0.3)',
                    borderRadius: '16px',
                    color: 'var(--sys-label)',
                    fontSize: '14px',
                    fontWeight: 500,
                    fontFamily: 'var(--font-sf)',
                  },
                }}
              />
            </MaxProvider>
          </TelegramProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
