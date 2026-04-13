'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useBot } from '@/app/providers/BotProvider';

export const TelegramProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user, login } = useAuth();
  const { bot } = useBot(); // 👈 берём bot_id из провайдера
  const pathname = usePathname();
  const expanded = useRef(false);

  useEffect(() => {
    const tg = (window as any)?.Telegram?.WebApp;
    if (!tg?.initData) return;

    if (!expanded.current) {
      try {
        tg.ready();
        tg.expand();
      } catch {}
      expanded.current = true;
    }

    if (user) return;
    if (pathname?.includes('/login')) return;

    const token = localStorage.getItem('auth_token');
    if (token) return;

    // Ждём пока bot_id загрузится
    if (!bot?.bot_id) return;

    api
      .post('/api/auth/tma', {
        initData: tg.initData,
        platform: 'telegram',
        bot_id: bot.bot_id, // 👈 динамически
      })
      .then(({ data }) => {
        localStorage.setItem('auth_token', data.token);
        login(data.user);
      })
      .catch(() => {});
  }, [pathname, user, bot]); // 👈 зависимость от bot

  return <>{children}</>;
};
