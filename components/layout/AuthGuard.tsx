'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { isPlatformLaunch, isAuthInProgress } from '@/lib/authState';
import { log } from '@/lib/logger';
import { NotAuthorizedPage } from '@/components/shared/NotAuthorizedPage';

// Жёсткий потолок ожидания тихого входа: покрывает 8с ожидания initData в
// провайдере + ретраи. Дольше держать лоадер нельзя — иначе анонимный web-юзер
// застрянет на спиннере.
const SILENT_LOGIN_CAP_MS = 9000;

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  // null = ещё не определили платформу (первый рендер). Держим лоадер, чтобы
  // не мигнуть guest-экраном до того, как поймём, что идёт тихий вход.
  const [isPlatform, setIsPlatform] = useState<boolean | null>(null);
  const [capReached, setCapReached] = useState(false);
  // authInProgress пересчитываем по тику — sessionStorage не реактивен.
  const [authInProgress, setAuthInProgress] = useState(false);

  useEffect(() => {
    const platform = isPlatformLaunch();
    setIsPlatform(platform);
    setAuthInProgress(isAuthInProgress());

    if (!platform) {
      setCapReached(true);
      return;
    }

    const cap = setTimeout(() => {
      log.warn('auth', 'silent_login_cap_reached', {});
      setCapReached(true);
    }, SILENT_LOGIN_CAP_MS);

    // Пока идёт тихий вход — переоцениваем состояние, чтобы вовремя отпустить
    // лоадер, как только вход завершится (успехом или провалом).
    const poll = setInterval(() => setAuthInProgress(isAuthInProgress()), 400);

    return () => {
      clearTimeout(cap);
      clearInterval(poll);
    };
  }, []);

  // Ждём тихий вход: платформа ещё не определена ИЛИ (платформенный запуск +
  // потолок не достигнут + вход идёт/юзера ещё нет).
  const waitingForSilentLogin =
    isPlatform === null ||
    (isPlatform && !capReached && (authInProgress || !user));

  useEffect(() => {
    if (isLoading || user || waitingForSilentLogin) return;
    // Раньше здесь был router.replace('/login') — теперь показываем
    // мотивирующий guest-экран (NotAuthorizedPage) вместо редиректа/пустоты.
    log.info('auth', 'guest_page_shown', { platform: isPlatform });
  }, [user, isLoading, waitingForSilentLogin, isPlatform]);

  if (isLoading || (!user && waitingForSilentLogin)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-foreground/10 animate-pulse" />
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Гость (вход не выполнен и тихий вход не идёт) — богатый экран вместо пустоты.
  if (!user) return <NotAuthorizedPage />;

  return <>{children}</>;
}
