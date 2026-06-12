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

  const user = getPlatformUser();
  if (user) {
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    if (name) out.name = name;
    if (user.username) out.username = String(user.username);
    if (typeof user.is_premium === 'boolean') out.tg_premium = user.is_premium;
    if (user.language_code) out.lang = String(user.language_code);
  }

  const inviter = getInviterId();
  if (inviter) out.inviter = inviter;

  return out;
}
