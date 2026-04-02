import axios from 'axios';

// Получаем user_id из всех возможных источников авторизации
function getUserId(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    // 1. Telegram WebApp user
    const tgUser = sessionStorage.getItem('tg_user');
    if (tgUser) {
      const user = JSON.parse(tgUser);
      if (user?.id) return user.id;
    }

    // 2. JWT Bearer token
    const token = localStorage.getItem('auth_token');
    if (token) {
      const parts = token.split('.');
      if (parts.length === 3) {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = atob(base64);
        const decoded = JSON.parse(json);
        // Поддерживаем разные структуры JWT: { user: { id } } или { id } или { user_id }
        const id = decoded?.user?.id ?? decoded?.id ?? decoded?.user_id ?? null;
        if (id) return id;
      }
    }

    // 3. Session-based auth (email/MAX login)
    const sessionData = localStorage.getItem('session_data');
    if (sessionData) {
      const parsed = JSON.parse(sessionData);
      if (parsed?.id) return parsed.id;
    }
  } catch {}
  return null;
}

function getBotId(): string | undefined {
  return process.env.NEXT_PUBLIC_BOT_ID;
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // X-Init-Data для TMA авторизации (если нет Bearer)
    const tg = (window as any)?.Telegram?.WebApp;
    if (!token && tg?.initData) {
      config.headers['X-Init-Data'] = tg.initData;
    }

    const botId = getBotId();
    const userId = getUserId();

    // Всегда добавляем bot_id и user_id в params — бэкенд их требует
    config.params = {
      ...config.params,
      ...(botId ? { bot_id: botId } : {}),
      ...(userId ? { user_id: userId } : {}),
    };
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('session_data');
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
