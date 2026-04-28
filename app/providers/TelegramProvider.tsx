'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useBot } from '@/app/providers/BotProvider';
import { getAppSource } from '@/lib/source';
import { waitForPlatformInitData } from '@/lib/platform';

export const TelegramProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user, login } = useAuth();
  const { bot } = useBot();
  const pathname = usePathname();
  const expanded = useRef(false);
  const attempted = useRef(false);

  useEffect(() => {
    const source = getAppSource();
    if (source !== 'tg') return;

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
        (window as any)?.Telegram?.WebApp?.ready?.();
        (window as any)?.Telegram?.WebApp?.expand?.();
      } catch { }
      expanded.current = true;
    }

    // Ждём появления initData — до 5 секунд с интервалом 100ms
    waitForPlatformInitData(5000).then((initData) => {
      if (!initData) {
        // initData так и не появился за 5 секунд — сбрасываем флаг
        attempted.current = false;
        console.warn('[TelegramProvider] initData not available after 5s timeout');
        return;
      }

      // После получения initData — ещё раз expand на случай если раньше не сработало
      if (!expanded.current) {
        try {
          (window as any)?.Telegram?.WebApp?.ready?.();
          (window as any)?.Telegram?.WebApp?.expand?.();
        } catch { }
        expanded.current = true;
      }

      api
        .post(
          '/api/auth/tma',
          {
            initData,
            platform: 'telegram',
            bot_id: bot.bot_id,
          },
          {
            headers: {
              'x-init-data': initData,
              'x-bot-id': String(bot.bot_id),
              'x-platform': 'telegram',
            },
          }
        )
        .then(({ data }) => {
          localStorage.setItem('auth_token', data.token);
          if (data.user?.id)
            localStorage.setItem('auth_user_id', String(data.user.id));
          login(data.user);
        })
        .catch((err) => {
          console.error('[TelegramProvider] auth/tma error:', err);
          // Сбрасываем флаг чтобы можно было попробовать снова при следующем рендере
          attempted.current = false;
        });
    });
  }, [pathname, user, bot]);

  return <>{children}</>;
};