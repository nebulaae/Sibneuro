/* ────────────────────────────────────────────────────────────────────────────
 * Fullscreen мини-аппа
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Минимальный контракт объекта WebApp — window.Telegram.WebApp у Telegram и
 * window.WebApp у Max. Все поля необязательные: набор методов зависит от
 * версии клиента, поэтому вызывать их можно только опционально.
 */
type MiniAppWebApp = {
  ready?: () => void;
  expand?: () => void;
  disableVerticalSwipes?: () => void;
  requestFullscreen?: () => void;
  isFullscreen?: boolean;
  isVersionAtLeast?: (version: string) => boolean;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  setBottomBarColor?: (color: string) => void;
  safeAreaInset?: unknown;
  contentSafeAreaInset?: unknown;
  onEvent?: (event: string, handler: () => void) => void;
  offEvent?: (event: string, handler: () => void) => void;
};

type Insets = { top: number; right: number; bottom: number; left: number };

const ZERO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

function readInsets(raw: unknown): Insets {
  if (!raw || typeof raw !== 'object') return ZERO_INSETS;
  const src = raw as Record<string, unknown>;
  const num = (v: unknown) =>
    typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0;
  return {
    top: num(src.top),
    right: num(src.right),
    bottom: num(src.bottom),
    left: num(src.left),
  };
}

/**
 * Публикует безопасные отступы в CSS-переменные --sa-*.
 *
 * Почему нельзя обойтись env(safe-area-inset-*): в fullscreen-режиме Telegram
 * webview формально занимает весь экран, поэтому env() отдаёт нули, а поверх
 * контента висят системная «чёлка» и телеграмовские кнопки (закрыть / «⋮»).
 * Реальные отступы клиент отдаёт только через safeAreaInset (железо) и
 * contentSafeAreaInset (шапка самого Telegram) — их и складываем.
 */
function publishSafeArea(wa: MiniAppWebApp | undefined): void {
  if (typeof document === 'undefined') return;

  // Клиент до Bot API 8.0 (и Max) вообще не отдаёт отступы. Тогда ничего не
  // трогаем: окно там не fullscreen, и системные env() из :root верны.
  if (!wa?.safeAreaInset && !wa?.contentSafeAreaInset) return;

  const hw = readInsets(wa.safeAreaInset);
  const content = readInsets(wa.contentSafeAreaInset);

  // max(env, значение клиента), а не просто значение: клиент может прислать
  // нули (например, ещё не посчитал), и мы не должны затирать ими корректные
  // системные отступы.
  const set = (name: string, env: string, value: number) =>
    document.documentElement.style.setProperty(
      name,
      `max(env(${env}, 0px), ${value}px)`
    );

  set('--sa-top', 'safe-area-inset-top', hw.top + content.top);
  set('--sa-bottom', 'safe-area-inset-bottom', hw.bottom + content.bottom);
  set('--sa-left', 'safe-area-inset-left', hw.left + content.left);
  set('--sa-right', 'safe-area-inset-right', hw.right + content.right);
}

/** true, если клиент поддерживает запрошенную версию Bot API. */
function supportsVersion(
  wa: MiniAppWebApp | undefined,
  version: string
): boolean {
  try {
    if (typeof wa?.isVersionAtLeast === 'function') {
      return !!wa.isVersionAtLeast(version);
    }
  } catch {}
  return false;
}

/**
 * Разворачивает мини-апп на весь экран (fullscreen, Bot API 8.0+), запрещает
 * вертикальные свайпы и держит CSS-переменные --sa-* в актуальном состоянии.
 *
 * Порядок деградации:
 *   1. requestFullscreen() — контент занимает весь экран устройства;
 *   2. expand() — на клиентах до Bot API 8.0 разворачивает на всю высоту шторки;
 *   3. ничего — обычный браузер, работают env(safe-area-inset-*).
 *
 * Вызывать можно на любой платформе и многократно — отсутствующие методы молча
 * игнорируются. SDK может подгрузиться позже монтирования, поэтому попытка
 * повторяется короткое время, пока WebApp не появится.
 *
 * Возвращает функцию очистки (снимает подписки и останавливает polling).
 */
export function configureMiniAppViewport(): () => void {
  if (typeof window === 'undefined') return () => {};

  const cleanups: Array<() => void> = [];
  const configured = new WeakSet<object>();

  const goFullscreen = (wa: MiniAppWebApp) => {
    // expand() зовём всегда: на клиентах без fullscreen это единственный способ
    // раскрыть окно, а в fullscreen он безвреден.
    try {
      wa.expand?.();
    } catch {}

    if (typeof wa.requestFullscreen !== 'function') return;
    // isVersionAtLeast есть только у Telegram; у Max проверку пропускаем.
    if (typeof wa.isVersionAtLeast === 'function' && !supportsVersion(wa, '8.0'))
      return;
    if (wa.isFullscreen) return;

    try {
      wa.requestFullscreen();
    } catch {}
  };

  const apply = (wa: MiniAppWebApp | undefined): boolean => {
    if (!wa) return false;

    try {
      wa.ready?.();
    } catch {}

    goFullscreen(wa);

    try {
      // Bot API 7.7+: не даёт свернуть/закрыть мини-апп вертикальным свайпом
      wa.disableVerticalSwipes?.();
    } catch {}

    // Приложение полностью чёрное — красим системные полосы клиента в тон,
    // иначе в fullscreen видна светлая рамка поверх контента.
    try {
      wa.setHeaderColor?.('#000000');
      wa.setBackgroundColor?.('#000000');
      wa.setBottomBarColor?.('#000000');
    } catch {}

    publishSafeArea(wa);

    // Подписки вешаем один раз на каждый объект WebApp.
    if (!configured.has(wa) && typeof wa.onEvent === 'function') {
      configured.add(wa);

      const sync = () => publishSafeArea(wa);
      const onFullscreenChanged = () => {
        document.documentElement.classList.toggle(
          'is-fullscreen',
          !!wa.isFullscreen
        );
        publishSafeArea(wa);
      };
      // Клиент может отказать (например, уже открыт в fullscreen другим
      // приложением) — тогда остаёмся на expand(), но отступы всё равно нужны.
      const onFullscreenFailed = () => {
        try {
          wa.expand?.();
        } catch {}
        publishSafeArea(wa);
      };

      const events: Array<[string, () => void]> = [
        ['safeAreaChanged', sync],
        ['contentSafeAreaChanged', sync],
        ['viewportChanged', sync],
        ['fullscreenChanged', onFullscreenChanged],
        ['fullscreenFailed', onFullscreenFailed],
      ];

      for (const [name, handler] of events) {
        try {
          wa.onEvent(name, handler);
          cleanups.push(() => {
            try {
              wa.offEvent?.(name, handler);
            } catch {}
          });
        } catch {}
      }

      onFullscreenChanged();
    }

    return true;
  };

  const tryApply = (): boolean => {
    const tg = (window as any)?.Telegram?.WebApp;
    const maxWA = (window as any)?.WebApp;
    let ok = false;
    if (apply(tg)) ok = true;
    if (apply(maxWA)) ok = true;
    return ok;
  };

  // Немедленная попытка + короткий polling на случай позднего SDK
  if (!tryApply()) {
    let count = 0;
    const timer = setInterval(() => {
      count++;
      if (tryApply() || count > 40) clearInterval(timer);
    }, 100);
    cleanups.push(() => clearInterval(timer));
  }

  // Возврат в мини-апп из фонового режима иногда сбрасывает fullscreen —
  // перезапрашиваем его при показе вкладки.
  const onVisibility = () => {
    if (document.visibilityState === 'visible') tryApply();
  };
  document.addEventListener('visibilitychange', onVisibility);
  cleanups.push(() =>
    document.removeEventListener('visibilitychange', onVisibility)
  );

  return () => cleanups.forEach((fn) => fn());
}

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

/**
 * Открывает внешнюю ссылку так, как принято на текущей платформе.
 *
 * Внутри мини-аппа обычный window.open либо блокируется, либо открывает
 * страницу в том же webview поверх приложения — из неё уже не вернуться.
 * Telegram и Max для этого дают openLink(), который отдаёт ссылку системному
 * браузеру. Вне мини-аппа — обычная новая вкладка.
 */
export function openExternalLink(url: string): void {
  if (typeof window === 'undefined') return;

  const wa =
    ((window as { Telegram?: { WebApp?: MiniAppWebApp } }).Telegram?.WebApp as
      | (MiniAppWebApp & { openLink?: (u: string) => void })
      | undefined) ??
    ((window as { WebApp?: MiniAppWebApp }).WebApp as
      | (MiniAppWebApp & { openLink?: (u: string) => void })
      | undefined);

  try {
    if (typeof wa?.openLink === 'function') {
      wa.openLink(url);
      return;
    }
  } catch {}

  window.open(url, '_blank', 'noopener,noreferrer');
}
