'use client';

import Script from 'next/script';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { getAppSource } from '@/lib/source';

function ScriptsInner() {
  const searchParams = useSearchParams();
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    setSource(getAppSource());
  }, [searchParams]);

  if (source === 'tg') {
    return (
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
        onLoad={() => {
          try {
            (window as any)?.Telegram?.WebApp?.ready?.();
          } catch { }
        }}
      />
    );
  }

  if (source === 'max') {
    return (
      <Script
        src="https://st.max.ru/js/max-web-app.js"
        strategy="afterInteractive"
        onLoad={() => {
          try {
            (window as any)?.WebApp?.ready?.();
          } catch { }
        }}
      />
    );
  }

  return null;
}

export const PlatformScripts = () => {
  return (
    <Suspense fallback={null}>
      <ScriptsInner />
    </Suspense>
  );
};