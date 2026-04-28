/**
 * Синхронная версия — используется там, где await невозможен (interceptors и т.п.)
 */
export function getPlatformInitData(): string | null {
    if (typeof window === 'undefined') return null;

    const tg = (window as any)?.Telegram?.WebApp;
    if (tg?.initData) return tg.initData;

    const maxWA = (window as any)?.WebApp;
    if (maxWA?.initData) return maxWA.initData;

    try {
        const raw = sessionStorage.getItem('__telegram__initParams');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.tgWebAppData) return parsed.tgWebAppData;
        }
    } catch { }

    return null;
}

/**
 * Асинхронная версия — ждёт появления initData до таймаута.
 * Решает гонку: скрипт TG/Max загружен, но WebApp ещё не инициализирован.
 *
 * @param timeoutMs — максимальное время ожидания (по умолчанию 5000ms)
 * @param intervalMs — интервал проверки (по умолчанию 100ms)
 */
export function waitForPlatformInitData(
    timeoutMs = 5000,
    intervalMs = 100
): Promise<string | null> {
    return new Promise((resolve) => {
        // Если уже есть — возвращаем сразу
        const immediate = getPlatformInitData();
        if (immediate) {
            resolve(immediate);
            return;
        }

        const deadline = Date.now() + timeoutMs;

        const timer = setInterval(() => {
            const data = getPlatformInitData();
            if (data) {
                clearInterval(timer);
                resolve(data);
                return;
            }
            if (Date.now() >= deadline) {
                clearInterval(timer);
                resolve(null);
            }
        }, intervalMs);
    });
}