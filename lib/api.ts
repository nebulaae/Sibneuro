import axios from 'axios';
import { getAppSource } from '@/lib/source';

const AUTH_FREE_PATHS = [
  '/api/auth/create/email',
  '/api/auth/login/email',
  '/api/auth/tma',
  '/api/auth/telegram',
  '/api/bot',
];

function isAuthFreePath(url?: string): boolean {
  if (!url) return false;
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
        const id = decoded?.user?.id ?? decoded?.id ?? decoded?.user_id ?? null;
        if (id) return id;
      }
    }
    const tgUser = sessionStorage.getItem('tg_user');
    if (tgUser) {
      const user = JSON.parse(tgUser);
      if (user?.id) return user.id;
    }
  } catch {}
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
  } catch {}
  return process.env.NEXT_PUBLIC_BOT_ID;
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const url = config.url || '';
    const isFree = isAuthFreePath(url);

    if (!isFree) {
      const token = localStorage.getItem('auth_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }

    const token = localStorage.getItem('auth_token');
    if (!token) {
      const tg = (window as any)?.Telegram?.WebApp;
      const maxWA = (window as any)?.WebApp;
      const initData = tg?.initData || maxWA?.initData;
      if (initData) config.headers['X-Init-Data'] = initData;
    }

    const botId = getBotId();
    const userId = getUserId();
    const source = getAppSource();

    config.params = config.params || {};
    if (botId && !config.params.bot_id) config.params.bot_id = botId;
    if (userId && !config.params.user_id) config.params.user_id = userId;
    if (source) config.params.source = source;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    if (error.response?.status === 401 && !isAuthFreePath(url)) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('session_data');
      localStorage.removeItem('session_hash');
      localStorage.removeItem('session_user');
      localStorage.removeItem('auth_user_id');
      sessionStorage.removeItem('tg_user');
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.includes('/login')
      ) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
