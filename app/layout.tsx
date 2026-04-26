import Script from 'next/script';
import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { TelegramProvider } from './providers/TelegramProvider';
import { MaxProvider } from './providers/MaxProvider';
import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider } from './providers/AuthProvider';
import { BotProvider } from './providers/BotProvider';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

import './globals.css';

export const metadata: Metadata = {
  title: 'Sibneuro',
  description: 'AI Platform',
};

import { DynamicScripts } from '@/components/DynamicScripts';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
      </head>
      <body style={{ fontFamily: 'var(--font-sf)', margin: 0 }}>
        <DynamicScripts />
        <QueryProvider>
          <BotProvider>
            <AuthProvider>
              <TelegramProvider>
                <MaxProvider>
                  <NextIntlClientProvider locale={locale} messages={messages}>
                    {children}
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
                  </NextIntlClientProvider>
                </MaxProvider>
              </TelegramProvider>
            </AuthProvider>
          </BotProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
