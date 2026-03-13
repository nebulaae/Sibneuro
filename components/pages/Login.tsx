'use client';

import api from '@/lib/api';
import Image from 'next/image';

import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { LoginButton } from '@telegram-auth/react';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

export const Login = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, login, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const handleTelegramAuth = async (user: any) => {
    try {
      const { data } = await api.post('/api/auth/telegram', user);

      localStorage.setItem('auth_token', data.token);
      login(data.user);

      toast.success('Logged in with Telegram!');
      router.push('/');
    } catch (e: any) {
      console.error('Telegram login failed:', e);
      toast.error('Telegram login failed');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="hsl(var(--foreground))" />
            <path
              d="M8 16L13 21L24 10"
              stroke="hsl(var(--background))"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div
            style={{
              width: 20,
              height: 20,
              border: '2px solid hsl(var(--border))',
              borderTopColor: 'hsl(var(--foreground))',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
        <div>Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
      <div className="absolute inset-0 w-screen h-screen opacity-20 z-0">
        <Image
          src="/background.jpg"
          alt="background"
          width={1024}
          height={1024}
          draggable={false}
          className="object-cover w-screen h-screen"
        />
      </div>
      <div className="w-full max-w-[320px] space-y-8 text-center z-0">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Вход в аккаунт</h1>
        </div>

        <div className="space-y-4">
          <LoginButton
            botUsername="iamrdgbot"
            onAuthCallback={(user) =>
              handleTelegramAuth({
                ...user,
                bot_id: process.env.NEXT_PUBLIC_BOT_ID,
              })
            }
            showAvatar={false}
            buttonSize="large"
            cornerRadius={12}
            lang="ru"
          />
        </div>
        <p className="text-[11px] text-muted-foreground px-4">
          Продолжая, вы соглашаетесь с условиями использования и политикой
          конфиденциальности.
        </p>
      </div>
    </div>
  );
};

export { Login as default };
