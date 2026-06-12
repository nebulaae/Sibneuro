/**
 * Параметры аналитики, которые нужно прикреплять к КАЖДОМУ GET /api/user.
 *
 * Требование: к каждому /user запросу передавать name, username, tg_premium, lang
 * (для аналитики), а при открытии реферальной ссылки — ещё и inviter (айди из ссылки).
 */

export interface UserAnalyticsParams {
  name?: string;
  username?: string;
  tg_premium?: boolean;
  lang?: string;
  inviter?: number;
}

const INVITER_STORAGE_KEY = 'inviter_id';

/** Достаёт объект юзера платформы (Telegram / Max) из initDataUnsafe. */
function getPlatformUser(): Record<string, any> | null {
  if (typeof window === 'undefined') return null;
  try {
    const tg = (window as any)?.Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user) return tg.initDataUnsafe.user;

    const maxWA = (window as any)?.WebApp;
    if (maxWA?.initDataUnsafe?.user) return maxWA.initDataUnsafe.user;
  } catch {}
  return null;
}

/** Юзер из JWT (auth_token) — fallback когда initDataUnsafe недоступен (web/desktop). */
function getJwtUser(): Record<string, any> | null {
  if (typeof window === 'undefined') return null;
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(decodeURIComponent(escape(atob(base64))));
    return decoded?.user || decoded || null;
  } catch {}
  return null;
}

/** Юзер из storage (email/MAX-сессия или legacy tg_user). */
function getStoredUser(): Record<string, any> | null {
  if (typeof window === 'undefined') return null;
  try {
    const su = localStorage.getItem('session_user');
    if (su) return JSON.parse(su);
    const tu = sessionStorage.getItem('tg_user');
    if (tu) return JSON.parse(tu);
  } catch {}
  return null;
}

/** Текущая локаль: cookie next-intl → navigator. */
function getLocale(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const m = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
    if (m) return decodeURIComponent(m[1]);
  } catch {}
  try {
    if (navigator.language) return navigator.language.split('-')[0];
  } catch {}
  return null;
}

function buildName(u: Record<string, any> | null): string {
  if (!u) return '';
  if (u.name) return String(u.name).trim();
  return `${u.first_name || ''} ${u.last_name || ''}`.trim();
}

/**
 * Айди пригласившего (inviter).
 * Приоритет:
 *   1. URL ?ref= / ?inviter= (открыта реферальная ссылка на тренд) — сохраняем в localStorage
 *   2. localStorage inviter_id (сохранённый ранее)
 *   3. localStorage pending_referrer_id (выставляется при разборе start_param в Telegram)
 */
export function getInviterId(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('ref') || params.get('inviter');
    if (fromUrl) {
      const id = parseInt(fromUrl, 10);
      if (!isNaN(id) && id > 0) {
        try {
          localStorage.setItem(INVITER_STORAGE_KEY, String(id));
        } catch {}
        return id;
      }
    }

    const stored =
      localStorage.getItem(INVITER_STORAGE_KEY) ||
      localStorage.getItem('pending_referrer_id');
    if (stored) {
      const id = parseInt(stored, 10);
      if (!isNaN(id) && id > 0) return id;
    }
  } catch {}
  return null;
}

/** Принудительно сохранить inviter (например, после разбора start_param). */
export function setInviterId(id: number | string): void {
  if (typeof window === 'undefined') return;
  const parsed = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(parsed) || parsed <= 0) return;
  try {
    localStorage.setItem(INVITER_STORAGE_KEY, String(parsed));
  } catch {}
}

/**
 * Собирает параметры аналитики для GET /api/user.
 * Пустые/неизвестные поля не добавляются, чтобы не слать мусор на backend.
 */
export function getUserAnalyticsParams(): UserAnalyticsParams {
  const out: UserAnalyticsParams = {};

  // Источники по убыванию надёжности: платформа (Telegram/Max) → JWT → storage.
  const tgUser = getPlatformUser();
  const fallbackUser = tgUser || getJwtUser() || getStoredUser();

  const name = buildName(tgUser) || buildName(fallbackUser);
  if (name) out.name = name;

  const username = tgUser?.username || fallbackUser?.username;
  if (username) out.username = String(username);

  // tg_premium есть только у Telegram; иначе false (нужно для аналитики всегда).
  out.tg_premium = typeof tgUser?.is_premium === 'boolean' ? tgUser.is_premium : false;

  // lang: language_code из Telegram → локаль приложения → ru.
  out.lang = String(
    tgUser?.language_code || fallbackUser?.lang || getLocale() || 'ru'
  );

  const inviter = getInviterId();
  if (inviter) out.inviter = inviter;

  return out;
}
