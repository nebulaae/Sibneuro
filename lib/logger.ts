/**
 * Структурированное логирование фронтенда + трейсинг.
 *
 * Цель: при следующем инциденте причину видно в логах за минуты, а не часы.
 *
 * Что даёт:
 *  - session id — стабильный на сессию приложения (sessionStorage), связывает все события;
 *  - request id — на каждый API-вызов (заголовок X-Request-Id), пишется в успех/ошибку;
 *  - структурные события { ts, sid, scope, event, ...data } в консоль + кольцевой буфер;
 *  - именованные хелперы track.media / track.auth / track.upload для ключевых воронок.
 *
 * SSR-safe: на сервере молчит, ничего не падает.
 */

const SID_KEY = 'app_session_id';
const RING_MAX = 200;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEvent {
  ts: number;
  sid: string;
  level: LogLevel;
  scope: string;
  event: string;
  data?: Record<string, unknown>;
}

// Кольцевой буфер последних событий — можно выгрузить при инциденте.
const ring: LogEvent[] = [];

function isBrowser() {
  return typeof window !== 'undefined';
}

// rid: монотонный счётчик в рамках вкладки + случайный суффикс.
let ridCounter = 0;

/** Стабильный идентификатор сессии приложения (на вкладку). */
export function getSessionId(): string {
  if (!isBrowser()) return 'ssr';
  try {
    let sid = sessionStorage.getItem(SID_KEY);
    if (!sid) {
      sid = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    return 'no-storage';
  }
}

/** Новый идентификатор запроса/операции для корреляции. */
export function newRequestId(): string {
  ridCounter += 1;
  return `r_${Date.now().toString(36)}_${ridCounter.toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

function push(level: LogLevel, scope: string, event: string, data?: Record<string, unknown>) {
  const entry: LogEvent = {
    ts: Date.now(),
    sid: getSessionId(),
    level,
    scope,
    event,
    data,
  };

  ring.push(entry);
  if (ring.length > RING_MAX) ring.shift();

  if (!isBrowser()) return;

  // Компактный консольный вывод — удобно искать по [scope].
  const tag = `[${scope}] ${event}`;
  const payload = data && Object.keys(data).length ? data : '';
  // НЕ используем console.error — он триггерит overlay ошибок в Next dev.
  // Ошибки/предупреждения пишем через console.warn, остальное — console.log.
  const fn = level === 'error' || level === 'warn' ? console.warn : console.log;
  fn(tag, payload);
}

export const log = {
  debug: (scope: string, event: string, data?: Record<string, unknown>) =>
    push('debug', scope, event, data),
  info: (scope: string, event: string, data?: Record<string, unknown>) =>
    push('info', scope, event, data),
  warn: (scope: string, event: string, data?: Record<string, unknown>) =>
    push('warn', scope, event, data),
  error: (scope: string, event: string, data?: Record<string, unknown>) =>
    push('error', scope, event, data),
};

/** Последние события (для отправки в саппорт / выгрузки при инциденте). */
export function getRecentLogs(): LogEvent[] {
  return [...ring];
}

/** Текстовый дамп последних логов — для копирования/баг-репорта. */
export function dumpLogs(): string {
  return ring
    .map(
      (e) =>
        `${new Date(e.ts).toISOString()} ${e.level.toUpperCase()} [${e.scope}] ${e.event} ${
          e.data ? JSON.stringify(e.data) : ''
        }`
    )
    .join('\n');
}

// ── Именованная телеметрия ключевых воронок ──────────────────────────────────

export const track = {
  // Загрузка/отображение медиа (превью, вьюер, лента)
  media: {
    start: (url: string, ctx?: Record<string, unknown>) =>
      log.debug('media', 'load_start', { url: clip(url), ...ctx }),
    loaded: (url: string, ms: number, ctx?: Record<string, unknown>) =>
      log.info('media', 'load_ok', { url: clip(url), ms, ...ctx }),
    error: (url: string, attempt: number, ctx?: Record<string, unknown>) =>
      log.warn('media', 'load_error', { url: clip(url), attempt, ...ctx }),
    gaveUp: (url: string, attempts: number, ctx?: Record<string, unknown>) =>
      log.error('media', 'load_failed', { url: clip(url), attempts, ...ctx }),
    sanitized: (before: string, after: string) =>
      log.warn('media', 'url_sanitized', { before: clip(before), after: clip(after) }),
  },
  // Загрузка файлов (upload в S3 через бекенд)
  upload: {
    start: (rid: string, name: string, size: number, type: string) =>
      log.info('upload', 'start', { rid, name, size, type }),
    ok: (rid: string, ms: number, url: string) =>
      log.info('upload', 'ok', { rid, ms, url: clip(url) }),
    error: (rid: string, ms: number, message: string) =>
      log.error('upload', 'error', { rid, ms, message }),
  },
  // Авторизация (TMA / Max / email)
  auth: {
    attempt: (platform: string, attempt: number) =>
      log.info('auth', 'attempt', { platform, attempt }),
    noInitData: (platform: string, attempt: number) =>
      log.warn('auth', 'no_init_data', { platform, attempt }),
    ok: (platform: string, ms: number) => log.info('auth', 'ok', { platform, ms }),
    error: (platform: string, message: string) =>
      log.error('auth', 'error', { platform, message }),
  },
};

// Обрезаем длинные URL в логах, но оставляем хвост для распознавания файла.
function clip(s: string): string {
  if (typeof s !== 'string') return String(s);
  if (s.length <= 120) return s;
  return `${s.slice(0, 80)}…${s.slice(-30)}`;
}

// Доступ из консоли DevTools/Eruda при разборе инцидента вживую.
if (isBrowser()) {
  const w = window as unknown as {
    __appLogs?: typeof getRecentLogs;
    __appLogsDump?: typeof dumpLogs;
  };
  w.__appLogs = getRecentLogs;
  w.__appLogsDump = dumpLogs;
}
