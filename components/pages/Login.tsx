'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const Login = () => {
  const router = useRouter();

  useEffect(() => {
    const handleHashAuth = () => {
      const hash = window.location.hash;
      if (hash.includes('token=')) {
        const params = new URLSearchParams(hash.replace('#', '?'));
        const token = params.get('token');
        if (token) {
          localStorage.setItem('auth_token', token);
          window.history.replaceState(null, '', window.location.pathname);
          router.replace('/');
        }
      }
    };
    (window as any).onTelegramAuth = async (user: any) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/telegram-widget`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        }
      );
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('auth_token', data.token);
        router.push('/');
      }
    };

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', 'твой_имя_бота'); // ЗАМЕНИ НА СВОЕ
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    document.getElementById('tg-widget-container')?.appendChild(script);

    handleHashAuth();
  }, [router]);
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
          <div
            id="tg-widget-container"
            className="flex justify-center min-h-10"
          ></div>
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