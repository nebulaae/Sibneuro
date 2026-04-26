'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

export const DynamicScripts = () => {
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let s = params.get('source');
    if (s) {
      localStorage.setItem('app_source', s);
    } else {
      s = localStorage.getItem('app_source');
    }

    // fallback detection if source is missing
    if (!s && typeof navigator !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('telegram')) s = 'tg';
    }

    setSource(s);
  }, []);

  return (
    <>
      {source === 'tg' && (
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="afterInteractive"
        />
      )}
      {source === 'max' && (
        <Script
          src="https://st.max.ru/js/max-web-app.js"
          strategy="afterInteractive"
        />
      )}
    </>
  );
};
