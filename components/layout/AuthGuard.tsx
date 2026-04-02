'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

function isInsideWebApp(): boolean {
  if (typeof window === 'undefined') return false;
  const tg = (window as any)?.Telegram?.WebApp;
  if (tg?.initData) return true;
  const max =
    (window as any)?.max?.WebApp ||
    (window as any)?.MaxApp ||
    (window as any)?.VKWebApp;
  return !!max?.initData;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  // Даём провайдерам чуть времени на тихий авто-вход внутри WebApp
  const graceRef = useRef<boolean>(true);

  useEffect(() => {
    // Если мы внутри WebApp — даём 1.5с провайдерам залогинить до редиректа
    if (isInsideWebApp()) {
      const t = setTimeout(() => {
        graceRef.current = false;
      }, 1500);
      return () => clearTimeout(t);
    }
    graceRef.current = false;
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!user && !graceRef.current) {
      router.replace('/login');
    }
  }, [user, isLoading]);

  if (isLoading || (!user && isInsideWebApp())) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-foreground/10 animate-pulse" />
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
