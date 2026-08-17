'use client';

import { getAppSource } from '@/lib/source';

/**
 * Координация «тихого» входа в мини-аппе.
 *
 * Проблема (баг «иногда при первом открытии показывается экран логина»):
 * TMA-авторизация ждёт initData до 8с, а AuthGuard принимал решение о редиректе
 * на /login слишком рано, потому что определял «мы внутри WebApp» только по
 * наличию tg.initData — а его в момент гонки ещё нет. Здесь — общий флаг
 * «вход в процессе» и надёжный детект запуска из платформы.
 */

const IN_PROGRESS_KEY = 'auth_in_progress';

export function setAuthInProgress(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(IN_PROGRESS_KEY, '1');
  } catch {}
}

export function clearAuthInProgress(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(IN_PROGRESS_KEY);
  } catch {}
}

export function isAuthInProgress(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(IN_PROGRESS_KEY) === '1';
  } catch {
    return false;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Протухшая сессия
 * ──────────────────────────────────────────────────────────────────────────── */

const invalidationListeners = new Set<() => void>();

/**
 * Сигнал «сохранённая сессия оказалась невалидной» — бекенд ответил 401.
 *
 * Проблема, которую решает (баг «в шапке 0 токенов до перелогина»):
 * при старте AuthProvider достаёт пользователя из JWT в localStorage, поэтому
 * интерфейс выглядит авторизованным ещё до первого запроса. Провайдер тихого
 * входа при этом выходит сразу — раз токен есть, входить не нужно. Если токен
 * протух, первый же /api/user отдаёт 401, перехватчик стирает сессию — и
 * заново никто не логинится. Баланс так и остаётся нулевым, пока пользователь
 * вручную не выйдет и не зайдёт снова.
 *
 * Теперь перехватчик шлёт этот сигнал, а провайдеры повторяют тихий вход.
 */
export function notifyAuthInvalidated(): void {
  invalidationListeners.forEach((l) => {
    try {
      l();
    } catch {}
  });
}

/** Подписка на протухание сессии. Возвращает функцию отписки. */
export function onAuthInvalidated(cb: () => void): () => void {
  invalidationListeners.add(cb);
  return () => invalidationListeners.delete(cb);
}

/**
 * Запущено ли приложение из платформы (Telegram/Max), даже если initData ещё
 * не подъехал. Опираемся на getAppSource (URL ?source=, кэш, initParams, hash),
 * а не только на window.Telegram.WebApp.initData.
 */
export function isPlatformLaunch(): boolean {
  if (typeof window === 'undefined') return false;
  const source = getAppSource();
  if (source === 'tg' || source === 'max') return true;

  // Доп. сигналы на случай, если source ещё не определился.
  const w = window as unknown as {
    Telegram?: { WebApp?: { initData?: string } };
    WebApp?: { initData?: string };
  };
  if (w.Telegram?.WebApp?.initData) return true;
  if (w.WebApp?.initData) return true;

  try {
    if (sessionStorage.getItem('__telegram__initParams')) return true;
  } catch {}
  return false;
}
