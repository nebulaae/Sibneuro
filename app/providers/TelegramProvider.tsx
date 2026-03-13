'use client';

import { useEffect, useRef } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

export const TelegramProvider = ({ children }: any) => {
  const { login } = useAuth();
  const sent = useRef(false);

  useEffect(() => {
    const init = async () => {
      const tg = (window as any)?.Telegram?.WebApp;

      if (!tg || !tg.initData || sent.current) return;

      sent.current = true;

      tg.ready();
      tg.expand();

      try {
        const res = await api.post('/api/auth/tma', {
          initData: tg.initData,
          bot_id: process.env.NEXT_PUBLIC_BOT_ID,
        });

        localStorage.setItem('auth_token', res.data.token);

        login(res.data.user);
      } catch (e) {
        console.error('TMA auth failed', e);
        sent.current = false;
      }
    };

    init();

    const interval = setInterval(init, 400);

    return () => clearInterval(interval);
  }, []);

  return children;
};
