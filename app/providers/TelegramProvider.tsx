'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
  const router = useRouter();
  const expanded = useRef(false);
  const attempted = useRef(false);
  const retryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);
  const MAX_RETRIES = 3;

  const doAuth = useCallback(
    async (botId: number) => {
      if (attempted.current) return;
      attempted.current = true;

      // Expand/ready сразу
      if (!expanded.current) {
        try {
          (window as any)?.Telegram?.WebApp?.ready?.();
          (window as any)?.Telegram?.WebApp?.expand?.();
        } catch {}
        expanded.current = true;
      }

      // Ждём initData — до 8 секунд
      const initData = await waitForPlatformInitData(8000);

      if (!initData) {
        console.warn(
          `[TelegramProvider] initData not available (attempt ${retryCount.current + 1}/${MAX_RETRIES})`
        );
        attempted.current = false;
        retryCount.current++;

        if (retryCount.current < MAX_RETRIES) {
          // Ретрай через 1 секунду
          retryTimeout.current = setTimeout(() => {
            doAuth(botId);
          }, 1000);
        }
        return;
      }

      // Expand ещё раз после получения initData
      if (!expanded.current) {
        try {
          (window as any)?.Telegram?.WebApp?.ready?.();
          (window as any)?.Telegram?.WebApp?.expand?.();
        } catch {}
        expanded.current = true;
      }

      try {
        const referrerId = localStorage.getItem('pending_referrer_id');
        const { data } = await api.post(
          '/api/auth/tma',
          {
            initData,
            platform: 'telegram',
            bot_id: botId,
            ...(referrerId
              ? { referrer_id: Number(referrerId), ref: Number(referrerId) }
              : {}),
          },
          {
            headers: {
              'x-init-data': initData,
              'x-bot-id': String(botId),
              'x-platform': 'telegram',
            },
          }
        );
        localStorage.setItem('auth_token', data.token);
        if (data.user?.id) {
          localStorage.setItem('auth_user_id', String(data.user.id));
        }
        localStorage.removeItem('pending_referrer_id');
        login(data.user);
      } catch (err) {
        console.error('[TelegramProvider] auth/tma error:', err);
        attempted.current = false;
        retryCount.current++;

        if (retryCount.current < MAX_RETRIES) {
          retryTimeout.current = setTimeout(() => {
            doAuth(botId);
          }, 1500);
        }
      }
    },
    [login]
  );

  useEffect(() => {
    const source = getAppSource();
    if (source !== 'tg') return;

    if (user) return;
    if (pathname?.includes('/login')) return;

    const token = localStorage.getItem('auth_token');
    if (token) return;

    if (!bot?.bot_id) return;

    doAuth(bot.bot_id);

    return () => {
      if (retryTimeout.current) {
        clearTimeout(retryTimeout.current);
      }
    };
  }, [pathname, user, bot, doAuth]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('start_param_processed')) return;

    const checkStartParam = () => {
      let startParam = '';

      try {
        const tg = (window as any)?.Telegram?.WebApp;
        startParam = tg?.initDataUnsafe?.start_param || '';
      } catch {}

      if (!startParam) {
        try {
          startParam =
            new URLSearchParams(window.location.search).get(
              'tgWebAppStartParam'
            ) || '';
        } catch {}
      }

      if (!startParam) return;

      if (startParam.startsWith('post-')) {
        const postMatch = startParam.match(/^post-(\d+)/);
        const refMatch = startParam.match(/[_-]ref-(\d+)/);

        if (refMatch) {
          localStorage.setItem('pending_referrer_id', refMatch[1]);
        }

        if (postMatch) {
          sessionStorage.setItem('start_param_processed', 'true');
          router.replace(`/trend/${postMatch[1]}`);
        }
        return;
      }

      const refMatch = startParam.match(/^(?:ref-)?(\d+)$/);
      if (refMatch) {
        localStorage.setItem('pending_referrer_id', refMatch[1]);
      }
    };

    checkStartParam();
    const timer = setTimeout(checkStartParam, 1000);
    return () => clearTimeout(timer);
  }, [router]);

  return <>{children}</>;
};
