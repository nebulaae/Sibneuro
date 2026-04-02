'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

// TelegramProvider больше не делает авто-вход сам —
// это теперь делает страница Login, чтобы не было двойных запросов.
// Провайдер только разворачивает WebApp и держит SDK готовым.
export const TelegramProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user, login } = useAuth();
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

    // Если пользователь уже есть — ничего не делаем
    if (user) return;

    // Если мы не на странице логина — пробуем тихий авто-вход
    // (на случай если страница открылась не через /login, а напрямую)
    if (pathname?.includes('/login')) return;

    const token = localStorage.getItem('auth_token');
    if (token) return; // токен есть — AuthProvider разберётся

    api
      .post('/api/auth/tma', {
        initData: tg.initData,
        platform: 'telegram',
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
