'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

// Аналогично TelegramProvider — только тихий авто-вход вне /login.
// На странице /login авто-вход делает сам Login компонент.
export const MaxProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, login } = useAuth();
  const pathname = usePathname();
  const expanded = useRef(false);

  useEffect(() => {
    const max =
      (window as any)?.max?.WebApp ||
      (window as any)?.MaxApp ||
      (window as any)?.VKWebApp;

    if (!max?.initData) return;

    if (!expanded.current) {
      try {
        max.ready?.();
        max.expand?.();
      } catch {}
      expanded.current = true;
    }

    if (user) return;
    if (pathname?.includes('/login')) return;

    const token = localStorage.getItem('auth_token');
    if (token) return;

    api
      .post('/api/auth/tma', {
        initData: max.initData,
        platform: 'max',
        bot_id: process.env.NEXT_PUBLIC_BOT_ID,
      })
      .then(({ data }) => {
        localStorage.setItem('auth_token', data.token);
        login(data.user);
      })
      .catch(() => {});
  }, [pathname, user]);

  return <>{children}</>;
};
