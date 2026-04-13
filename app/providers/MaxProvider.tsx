'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useBot } from '@/app/providers/BotProvider';

export const MaxProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, login } = useAuth();
  const { bot } = useBot(); // 👈
  const pathname = usePathname();
  const expanded = useRef(false);

  useEffect(() => {
    const maxWA = (window as any)?.WebApp;
    if (!maxWA?.initData) return;

    if (!expanded.current) {
      try {
        maxWA.ready?.();
        maxWA.expand?.();
      } catch {}
      expanded.current = true;
    }

    if (user) return;
    if (pathname?.includes('/login')) return;

    const token = localStorage.getItem('auth_token');
    if (token) return;

    if (!bot?.bot_id) return;

    api
      .post('/api/auth/tma', {
        initData: maxWA.initData,
        platform: 'max',
        bot_id: bot.bot_id, // 👈 динамически (max_username для MAX если нужен)
      })
      .then(({ data }) => {
        localStorage.setItem('auth_token', data.token);
        if (data.user?.id)
          localStorage.setItem('auth_user_id', String(data.user.id));
        login(data.user);
      })
      .catch(() => {});
  }, [pathname, user, bot]);

  return <>{children}</>;
};
