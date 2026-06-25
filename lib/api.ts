import axios from 'axios';
import { getAppSource } from '@/lib/source';
import { getPlatformInitData } from './platform';
import { log, newRequestId, getSessionId } from '@/lib/logger';

const AUTH_FREE_PATHS = [
  '/api/auth/create/email',
  '/api/auth/login/email',
  '/api/auth/tma',
  '/api/auth/telegram',
  '/api/bot',
  '/api/posts',
];

function isAuthFreePath(url?: string): boolean {
  if (!url) return false;
  // These specific endpoints under /api/posts require authentication
  if (
    url.includes('/api/posts/publish') ||
    url.includes('/api/posts/like') ||
    url.includes('/api/posts/comment')
  ) {
    return false;
  }
  return AUTH_FREE_PATHS.some((p) => url.includes(p));
}

function getUserId(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('auth_user_id');
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }

    const token = localStorage.getItem('auth_token');
    if (token) {
      const parts = token.split('.');
      if (parts.length === 3) {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const decoded = JSON.parse(atob(base64));
        return decoded?.user?.id ?? decoded?.id ?? decoded?.user_id ?? null;
      }
    }

    const tgUser = sessionStorage.getItem('tg_user');
    if (tgUser) {
      const user = JSON.parse(tgUser);
      if (user?.id) return user.id;
    }
  } catch { }

  return null;
}

function getBotId(): number | string | undefined {
  if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_BOT_ID;

  try {
    const raw = localStorage.getItem('bot_info');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.bot_id) return parsed.bot_id;
    }
  } catch { }

  return process.env.NEXT_PUBLIC_BOT_ID;
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window === 'undefined') return config;

  const url = config.url || '';
  const isFree = isAuthFreePath(url);

  // auth header
  if (!isFree) {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  // init data
  const token = localStorage.getItem('auth_token');
  if (!token) {
    const initData = getPlatformInitData();
    if (initData) {
      config.headers['X-Init-Data'] = initData;
    }
  }

  const botId = getBotId();
  const userId = getUserId();
  const source = getAppSource();

  config.params = config.params || {};

  // 👇 NEW: bypass flag
  const skipUserId = config.params.skipUserId;

  // 8560085473 - botid only for devmode trend fetching

  if (botId && !config.params.bot_id) {
    config.params.bot_id = 8560085473;
  }

  if (userId && !skipUserId && !config.params.user_id) {
    config.params.user_id = userId;
  }

  if (source) {
    config.params.source = source;
  }

  // cleanup (не отправляем на backend)
  if (config.params.skipUserId) {
    delete config.params.skipUserId;
  }

  // Трейсинг: request id + session id в заголовки и в метаданные для логов.
  const rid = newRequestId();
  config.headers['X-Request-Id'] = rid;
  config.headers['X-Session-Id'] = getSessionId();
  (config as any).__meta = { rid, start: Date.now() };

  return config;
});

api.interceptors.response.use(
  (response) => {
    const meta = (response.config as any)?.__meta;
    if (meta) {
      log.debug('api', 'ok', {
        rid: meta.rid,
        url: response.config?.url,
        status: response.status,
        ms: Date.now() - meta.start,
      });
    }
    return response;
  },
  (error) => {
    const url = error.config?.url || '';
    const meta = (error.config as any)?.__meta;
    log.error('api', 'error', {
      rid: meta?.rid,
      url,
      status: error.response?.status ?? null,
      ms: meta ? Date.now() - meta.start : null,
      code: error.code,
      message:
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message,
    });

    if (error.response?.status === 401 && !isAuthFreePath(url)) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('session_data');
      localStorage.removeItem('session_hash');
      localStorage.removeItem('session_user');
      localStorage.removeItem('auth_user_id');
      sessionStorage.removeItem('tg_user');
    }

    return Promise.reject(error);
  }
);

export default api;
