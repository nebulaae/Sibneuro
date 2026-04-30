'use client';

import Script from 'next/script';

/**
 * Загружает SDK обеих платформ (Telegram и Max) безусловно — при любом source.
 *
 * Зачем: если грузить скрипты только по source, возникает гонка — к моменту
 * первого рендера source ещё не определён (useSearchParams работает
 * асинхронно), и скрипт не загружается вовсе или загружается слишком поздно.
 *
 * Страница при source=max корректно работает даже если telegram-web-app.js
 * не загрузился (сетевая блокировка IP Telegram): авторизация идёт через
 * MaxProvider который читает window.WebApp, а не window.Telegram.WebApp.
 *
 * Порядок загрузки: afterInteractive — аналог <script src="..."> в <head>,
 * скрипты исполняются синхронно сразу после гидрации.
 */
export const PlatformScripts = () => {
  return (
    <>
      {/* Telegram Web App SDK — грузим всегда */}
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
        onLoad={() => {
          try {
            (window as any)?.Telegram?.WebApp?.ready?.();
          } catch {}
        }}
        onError={() => {
          // Игнорируем — при source=max страница работает без этого скрипта
          console.warn(
            '[PlatformScripts] telegram-web-app.js failed to load (expected if Telegram IPs are blocked)'
          );
        }}
      />

      {/* Max Web App SDK — грузим всегда */}
      <Script
        src="https://st.max.ru/js/max-web-app.js"
        strategy="afterInteractive"
        onLoad={() => {
          try {
            (window as any)?.WebApp?.ready?.();
          } catch {}
        }}
        onError={() => {
          console.warn('[PlatformScripts] max-web-app.js failed to load');
        }}
      />
    </>
  );
};
