import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    const tgInitData = (window as any).Telegram?.WebApp?.initData;
    const botId = process.env.NEXT_PUBLIC_BOT_ID || '1';

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (tgInitData) {
      config.headers['X-Init-Data'] = tgInitData;
    }

    // Всегда прокидываем bot_id для бекенда
    config.params = { ...config.params, bot_id: botId };
  }
  return config;
});

export default api;
