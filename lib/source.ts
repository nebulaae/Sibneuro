/**
 * Определяет источник запуска приложения.
 *
 * Приоритет:
 * 1. URL-параметр ?source=tg|max (самый надёжный, передаётся явно)
 * 2. sessionStorage (кэш между навигациями)
 * 3. Авто-детект по наличию WebApp объектов
 * 4. null — браузер / неизвестно
 */
export const getAppSource = (): string | null => {
  if (typeof window === 'undefined') return null;

  try {
    // 1. URL параметр — наиболее надёжный источник истины
    const params = new URLSearchParams(window.location.search);
    const sourceParam = params.get('source');
    if (sourceParam) {
      // Нормализуем: 'telegram' → 'tg'
      const normalized = normalizeSource(sourceParam);
      if (normalized) {
        sessionStorage.setItem('app_source', normalized);
        return normalized;
      }
    }

    // 2. sessionStorage — сохранённый источник
    const cached = sessionStorage.getItem('app_source');
    if (cached) return cached;

    // 3. Авто-детект по Telegram initParams в sessionStorage
    try {
      const raw = sessionStorage.getItem('__telegram__initParams');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.tgWebAppData && parsed.tgWebAppData.length > 0) {
          sessionStorage.setItem('app_source', 'tg');
          return 'tg';
        }
      }
    } catch {}

    // 4. Авто-детект по наличию WebApp объектов в window
    // ВАЖНО: этот детект может не работать в момент первого рендера,
    // т.к. скрипты загружаются асинхронно. Используем только как fallback.
    if ((window as any)?.Telegram?.WebApp?.initData) {
      sessionStorage.setItem('app_source', 'tg');
      return 'tg';
    }

    // Max WebApp — глобальный объект WebApp (не Telegram)
    const maxWA = (window as any)?.WebApp;
    if (maxWA && maxWA?.initData && !(window as any)?.Telegram) {
      sessionStorage.setItem('app_source', 'max');
      return 'max';
    }

    // 5. URL hash — некоторые платформы передают данные через hash
    try {
      const hash = window.location.hash;
      if (hash && hash.includes('tgWebAppData=')) {
        sessionStorage.setItem('app_source', 'tg');
        return 'tg';
      }
    } catch {}
  } catch {}

  return null;
};

function normalizeSource(source: string): string | null {
  const s = source.toLowerCase().trim();
  if (s === 'tg' || s === 'telegram') return 'tg';
  if (s === 'max' || s === 'max_messenger') return 'max';
  if (s === 'browser' || s === 'web') return 'browser';
  // Возвращаем как есть если не пустой
  if (s.length > 0) return s;
  return null;
}

/**
 * Принудительно сохраняет source в sessionStorage.
 * Используется при инициализации провайдеров.
 */
export const setAppSource = (source: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const normalized = normalizeSource(source);
    if (normalized) {
      sessionStorage.setItem('app_source', normalized);
    }
  } catch {}
};

/**
 * Асинхронная версия getAppSource — ждёт пока SDK загрузится
 * для более точного авто-детекта.
 * Используется в провайдерах при неизвестном source.
 */
export async function detectAppSourceAsync(
  timeoutMs = 3000
): Promise<string | null> {
  // Сначала пробуем синхронно
  const sync = getAppSource();
  if (sync) return sync;

  // Ждём немного — SDK может ещё не загрузиться
  return new Promise((resolve) => {
    let resolved = false;
    let attempts = 0;
    const maxAttempts = Math.ceil(timeoutMs / 100);

    const timer = setInterval(() => {
      attempts++;
      const source = getAppSource();
      if (source || attempts >= maxAttempts) {
        clearInterval(timer);
        if (!resolved) {
          resolved = true;
          resolve(source);
        }
      }
    }, 100);
  });
}
