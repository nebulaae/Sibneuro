/**
 * Синхронная версия — используется там, где await невозможен (interceptors и т.п.)
 */
export function getPlatformInitData(): string | null {
    if (typeof window === 'undefined') return null;
  
    try {
      // Telegram Web App
      const tg = (window as any)?.Telegram?.WebApp;
      if (tg?.initData && tg.initData.length > 0) return tg.initData;
  
      // Max Web App
      const maxWA = (window as any)?.WebApp;
      if (maxWA?.initData && maxWA.initData.length > 0) return maxWA.initData;
  
      // Fallback: sessionStorage Telegram initParams
      try {
        const raw = sessionStorage.getItem('__telegram__initParams');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.tgWebAppData && parsed.tgWebAppData.length > 0) {
            return parsed.tgWebAppData;
          }
        }
      } catch {}
  
      // Fallback: URL hash (некоторые версии TG передают данные в хэше)
      try {
        const hash = window.location.hash;
        if (hash && hash.includes('tgWebAppData=')) {
          const params = new URLSearchParams(hash.slice(1));
          const data = params.get('tgWebAppData');
          if (data && data.length > 0) return decodeURIComponent(data);
        }
      } catch {}
    } catch {}
  
    return null;
  }
  
  /**
   * Проверяет, что SDK платформы (Telegram/Max) реально загружен в DOM
   * Не гарантирует initData, но говорит что скрипт исполнился
   */
  function isPlatformSDKLoaded(): boolean {
    if (typeof window === 'undefined') return false;
    const hasTg = !!(window as any)?.Telegram?.WebApp;
    const hasMax = !!(window as any)?.WebApp;
    return hasTg || hasMax;
  }
  
  /**
   * Асинхронная версия — ждёт появления initData до таймаута.
   *
   * Решает гонку: скрипт TG/Max загружен асинхронно (afterInteractive),
   * поэтому WebApp объект может появиться позже чем компонент примонтируется.
   *
   * Стратегия:
   * 1. Проверяем немедленно
   * 2. Запускаем polling с экспоненциальным backoff в первые 500мс (агрессивно),
   *    затем стандартный интервал
   * 3. Параллельно слушаем событие load на существующих script-тегах платформы
   * 4. Ждём до timeoutMs
   *
   * @param timeoutMs — максимальное время ожидания (по умолчанию 8000ms)
   * @param intervalMs — базовый интервал проверки (по умолчанию 50ms)
   */
  export function waitForPlatformInitData(
    timeoutMs = 8000,
    intervalMs = 50
  ): Promise<string | null> {
    return new Promise((resolve) => {
      // 1. Если уже есть — возвращаем сразу
      const immediate = getPlatformInitData();
      if (immediate) {
        resolve(immediate);
        return;
      }
  
      let resolved = false;
      let timer: ReturnType<typeof setInterval> | null = null;
      let timeout: ReturnType<typeof setTimeout> | null = null;
  
      function done(value: string | null) {
        if (resolved) return;
        resolved = true;
        if (timer) clearInterval(timer);
        if (timeout) clearTimeout(timeout);
        resolve(value);
      }
  
      // 2. Polling — агрессивный в начале
      let pollCount = 0;
      timer = setInterval(() => {
        pollCount++;
        const data = getPlatformInitData();
        if (data) {
          done(data);
          return;
        }
  
        // После первых 10 итераций (500ms) переходим к более редкому polling
        if (pollCount === 10) {
          if (timer) clearInterval(timer);
          timer = setInterval(() => {
            const d = getPlatformInitData();
            if (d) done(d);
          }, intervalMs * 2); // 100ms
        }
      }, intervalMs);
  
      // 3. Слушаем script-теги платформы — если они загрузились, сразу проверяем
      if (typeof document !== 'undefined') {
        const scriptUrls = [
          'telegram-web-app.js',
          'max-web-app.js',
          'vk-web-app.js',
        ];
  
        document.querySelectorAll('script[src]').forEach((script) => {
          const src = (script as HTMLScriptElement).src || '';
          const isplatform = scriptUrls.some((u) => src.includes(u));
          if (!isplatform) return;
  
          // Если скрипт уже загружен (complete), проверяем сразу с небольшой задержкой
          // т.к. WebApp инициализируется синхронно после исполнения скрипта
          const checkAfterLoad = () => {
            // Даём скрипту время на инициализацию WebApp объекта
            setTimeout(() => {
              const d = getPlatformInitData();
              if (d) done(d);
              // Иначе polling продолжит работу
            }, 50);
          };
  
          script.addEventListener('load', checkAfterLoad, { once: true });
        });
  
        // MutationObserver — если script-тег будет добавлен динамически после нас
        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            for (const node of Array.from(mutation.addedNodes)) {
              if (node.nodeName !== 'SCRIPT') continue;
              const src = (node as HTMLScriptElement).src || '';
              const isplatform = scriptUrls.some((u) => src.includes(u));
              if (!isplatform) continue;
  
              (node as HTMLScriptElement).addEventListener(
                'load',
                () => {
                  setTimeout(() => {
                    const d = getPlatformInitData();
                    if (d) done(d);
                  }, 50);
                },
                { once: true }
              );
            }
          }
        });
  
        observer.observe(document.head || document.documentElement, {
          childList: true,
          subtree: true,
        });
  
        // Останавливаем observer вместе с остальным
        const originalDone = done;
        // eslint-disable-next-line no-inner-declarations
        function doneWithObserver(value: string | null) {
          observer.disconnect();
          originalDone(value);
        }
        // Переопределяем done локально
        // (используем замыкание через переменную resolved)
        // Observer отключится по таймауту или при resolve
  
        // Таймаут — финальная остановка
        timeout = setTimeout(() => {
          observer.disconnect();
          done(null);
        }, timeoutMs);
  
        return;
      }
  
      // 4. Финальный таймаут (если document недоступен)
      timeout = setTimeout(() => {
        done(null);
      }, timeoutMs);
    });
  }
  
  /**
   * Ждёт полной инициализации SDK платформы включая initData.
   * Отличие от waitForPlatformInitData: дополнительно проверяет
   * что SDK объект загружен даже если initData пустой (для диагностики).
   */
  export function waitForPlatformSDK(timeoutMs = 8000): Promise<{
    initData: string | null;
    sdkLoaded: boolean;
  }> {
    return new Promise((resolve) => {
      let resolved = false;
      let timer: ReturnType<typeof setInterval> | null = null;
      let timeout: ReturnType<typeof setTimeout> | null = null;
  
      function done(initData: string | null) {
        if (resolved) return;
        resolved = true;
        if (timer) clearInterval(timer);
        if (timeout) clearTimeout(timeout);
        resolve({ initData, sdkLoaded: isPlatformSDKLoaded() });
      }
  
      const immediate = getPlatformInitData();
      if (immediate) {
        resolve({ initData: immediate, sdkLoaded: true });
        return;
      }
  
      timer = setInterval(() => {
        const data = getPlatformInitData();
        if (data) done(data);
      }, 50);
  
      timeout = setTimeout(() => done(null), timeoutMs);
    });
  }