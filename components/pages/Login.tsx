'use client';

import api from '@/lib/api';
import Image from 'next/image';

import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { LoginButton } from '@telegram-auth/react';
import { useAuth } from '@/hooks/useAuth';

export const Login = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { login } = useAuth();

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
                bot_id: process.env.NEXT_PUBLIC_BOT_ID
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

export { Login as default }