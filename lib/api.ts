import axios from 'axios';

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

    const tg = (window as any)?.Telegram?.WebApp;

    if (!token && tg?.initData) {
      config.headers['X-Init-Data'] = tg.initData;
    }

    const botId = process.env.NEXT_PUBLIC_BOT_ID;
    config.params = { ...config.params, bot_id: botId };
  }

  return config;
});

export default api;
