'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useBot } from '@/app/providers/BotProvider';
import { getAppSource } from '@/lib/source';
import {
  waitForPlatformInitData,
  configureMiniAppViewport,
} from '@/lib/platform';
import { setAuthInProgress, clearAuthInProgress } from '@/lib/authState';
import { track } from '@/lib/logger';

export const MaxProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, login } = useAuth();
  const { bot } = useBot();
  const pathname = usePathname();
  const expanded = useRef(false);
  const attempted = useRef(false);
  const retryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);
  const MAX_RETRIES = 3;

  const doAuth = useCallback(
    async (botId: number) => {
      if (attempted.current) return;
      attempted.current = true;
      setAuthInProgress();
      const authStart = Date.now();
      track.auth.attempt('max', retryCount.current + 1);

      // Expand/ready сразу
      if (!expanded.current) {
        try {
          const maxWA = (window as any)?.WebApp;
          maxWA?.ready?.();
          maxWA?.expand?.();
        } catch {}
        expanded.current = true;
      }

      // Ждём initData — до 8 секунд
      const initData = await waitForPlatformInitData(8000);

      if (!initData) {
        track.auth.noInitData('max', retryCount.current + 1);
        attempted.current = false;
        retryCount.current++;

        if (retryCount.current < MAX_RETRIES) {
          retryTimeout.current = setTimeout(() => {
            doAuth(botId);
          }, 1000);
        } else {
          clearAuthInProgress();
        }
        return;
      }

      try {
        const { data } = await api.post('/api/auth/tma', {
          initData,
          platform: 'max',
          bot_id: botId,
        });
        localStorage.setItem('auth_token', data.token);
        if (data.user?.id) {
          localStorage.setItem('auth_user_id', String(data.user.id));
        }
        clearAuthInProgress();
        track.auth.ok('max', Date.now() - authStart);
        login(data.user);
      } catch (err) {
        track.auth.error(
          'max',
          err instanceof Error ? err.message : 'auth/tma failed'
        );
        attempted.current = false;
        retryCount.current++;

        if (retryCount.current < MAX_RETRIES) {
          retryTimeout.current = setTimeout(() => {
            doAuth(botId);
          }, 1500);
        } else {
          clearAuthInProgress();
        }
      }
    },
    [login]
  );

  // Разворот на весь экран и запрет свайпов — независимо от авторизации.
  useEffect(() => {
    if (getAppSource() !== 'max') return;
    return configureMiniAppViewport();
  }, []);

  useEffect(() => {
    const source = getAppSource();
    if (source !== 'max') return;

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

  return <>{children}</>;
};
