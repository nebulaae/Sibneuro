'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useBot } from '@/app/providers/BotProvider';
import { getAppSource } from '@/lib/source';
import { waitForPlatformInitData } from '@/lib/platform';

export const MaxProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, login } = useAuth();
  const { bot } = useBot();
  const pathname = usePathname();
  const expanded = useRef(false);
  const attempted = useRef(false);

  useEffect(() => {
    const source = getAppSource();
    if (source !== 'max') return;

    if (user) return;
    if (pathname?.includes('/login')) return;

    const token = localStorage.getItem('auth_token');
    if (token) return;

    if (!bot?.bot_id) return;

    // Не запускаем повторно если попытка уже идёт
    if (attempted.current) return;
    attempted.current = true;

    // Expand/ready вызываем сразу, не дожидаясь initData
    if (!expanded.current) {
      try {
        const maxWA = (window as any)?.WebApp;
        maxWA?.ready?.();
        maxWA?.expand?.();
      } catch { }
      expanded.current = true;
    }

    // Ждём появления initData — до 5 секунд с интервалом 100ms
    waitForPlatformInitData(5000).then((initData) => {
      if (!initData) {
        // initData так и не появился за 5 секунд — сбрасываем флаг
        attempted.current = false;
        console.warn('[MaxProvider] initData not available after 5s timeout');
        return;
      }

      api
        .post('/api/auth/tma', {
          initData,
          platform: 'max',
          bot_id: bot.bot_id,
        })
        .then(({ data }) => {
          localStorage.setItem('auth_token', data.token);
          if (data.user?.id)
            localStorage.setItem('auth_user_id', String(data.user.id));
          login(data.user);
        })
        .catch((err) => {
          console.error('[MaxProvider] auth/tma error:', err);
          // Сбрасываем флаг чтобы можно было попробовать снова
          attempted.current = false;
        });
    });
  }, [pathname, user, bot]);

  return <>{children}</>;
};