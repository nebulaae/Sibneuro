'use client';

import api from '@/lib/api';
import Image from 'next/image';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { LoginButton } from '@telegram-auth/react';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState, useRef } from 'react';
import { Loader2, Mail, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type AppEnv = 'telegram' | 'max' | 'browser';
type LoginView = 'main' | 'email-login' | 'email-register';

function detectEnv(): AppEnv {
  if (typeof window === 'undefined') return 'browser';
  const tg = (window as any)?.Telegram?.WebApp;
  if (tg?.initData) return 'telegram';
  const max =
    (window as any)?.max?.WebApp ||
    (window as any)?.MaxApp ||
    (window as any)?.VKWebApp;
  if (max?.initData) return 'max';
  return 'browser';
}

async function authViaTMA(initData: string, platform: 'telegram' | 'max') {
  const { data } = await api.post('/api/auth/tma', {
    initData,
    platform,
    bot_id: process.env.NEXT_PUBLIC_BOT_ID,
  });
  return data as { token: string; user: any };
}

export const Login = () => {
  const router = useRouter();
  const { user, login, isLoading } = useAuth();
  const [env, setEnv] = useState<AppEnv>('browser');
  const [autoLogging, setAutoLogging] = useState(false);
  const [autoError, setAutoError] = useState(false);
  const [view, setView] = useState<LoginView>('main');
  const attempted = useRef(false);

  // Email login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  // Register extra fields
  const [name, setName] = useState('');

  // Если уже авторизован — сразу на главную
  useEffect(() => {
    if (!isLoading && user) router.replace('/');
  }, [user, isLoading, router]);

  // Определяем окружение после гидрации
  useEffect(() => {
    setEnv(detectEnv());
  }, []);

  // Авто-вход через initData если находимся внутри WebApp
  useEffect(() => {
    if (env === 'browser' || attempted.current || isLoading) return;
    if (user) return;

    const tg = (window as any)?.Telegram?.WebApp;
    const max =
      (window as any)?.max?.WebApp ||
      (window as any)?.MaxApp ||
      (window as any)?.VKWebApp;

    const initData = env === 'telegram' ? tg?.initData : max?.initData;
    if (!initData) return;

    attempted.current = true;
    setAutoLogging(true);

    try {
      if (env === 'telegram') {
        tg.ready();
        tg.expand();
      } else {
        max?.ready?.();
        max?.expand?.();
      }
    } catch {}

    authViaTMA(initData, env)
      .then(({ token, user: u }) => {
        localStorage.setItem('auth_token', token);
        login(u);
        router.replace('/');
      })
      .catch((e) => {
        console.error('TMA auto-login failed', e);
        setAutoLogging(false);
        setAutoError(true);
        attempted.current = false;
      });
  }, [env, isLoading, user]);

  // Вход через Telegram Widget (браузер)
  const handleTelegramAuth = async (tgUser: any) => {
    try {
      const { data } = await api.post('/api/auth/telegram', {
        ...tgUser,
        bot_id: process.env.NEXT_PUBLIC_BOT_ID,
      });
      localStorage.setItem('auth_token', data.token);
      login(data.user);
      toast.success('Вход выполнен!');
      router.replace('/');
    } catch {
      toast.error('Ошибка входа через Telegram');
    }
  };

  // Вход через MAX (кнопка — открывает deep-link или инструкцию)
  const handleMaxLogin = () => {
    // MAX авторизация идёт через initData автоматически внутри Max WebApp.
    // В браузере показываем подсказку.
    toast('Откройте приложение через Max Messenger для автоматического входа');
  };

  // Вход по email
  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error('Введите email и пароль');
      return;
    }
    setEmailLoading(true);
    try {
      const { data } = await api.post('/api/auth/login/email', {
        email: email.trim(),
        password,
        bot_id: process.env.NEXT_PUBLIC_BOT_ID,
      });
      if (!data.token) throw new Error(data.error || 'Ошибка входа');
      localStorage.setItem('auth_token', data.token);
      login(data.user);
      toast.success('Вход выполнен!');
      router.replace('/');
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Ошибка входа';
      toast.error(msg);
    } finally {
      setEmailLoading(false);
    }
  };

  // Регистрация по email
  const handleEmailRegister = async () => {
    if (!email.trim() || !password.trim() || !name.trim()) {
      toast.error('Заполните все поля');
      return;
    }
    setEmailLoading(true);
    try {
      const { data } = await api.post(
        `/api/auth/create/email?bot_id=${process.env.NEXT_PUBLIC_BOT_ID}`,
        {
          email: email.trim(),
          password,
          name: name.trim(),
          lang: 'ru',
        }
      );
      if (!data.success) throw new Error(data.error || 'Ошибка регистрации');
      // После регистрации — получаем сессию и делаем вход
      toast.success('Аккаунт создан! Выполняется вход...');
      // Получаем токен через login/email
      const loginRes = await api.post('/api/auth/login/email', {
        email: email.trim(),
        password,
        bot_id: process.env.NEXT_PUBLIC_BOT_ID,
      });
      if (loginRes.data.token) {
        localStorage.setItem('auth_token', loginRes.data.token);
        login(loginRes.data.user);
        router.replace('/');
      } else {
        // Если бэкенд не вернул токен после регистрации, переводим на вход
        setView('email-login');
        toast('Аккаунт создан — выполните вход');
      }
    } catch (e: any) {
      const msg =
        e?.response?.data?.error || e?.message || 'Ошибка регистрации';
      if (e?.response?.status === 409) {
        toast.error('Пользователь с таким email уже существует');
      } else {
        toast.error(msg);
      }
    } finally {
      setEmailLoading(false);
    }
  };

  // --- Лоадер ---
  if (isLoading || autoLogging) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen bg-background overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/background.jpg"
            alt="background"
            fill
            className="object-cover opacity-20"
          />
        </div>
        <div className="z-10 flex flex-col items-center gap-4">
          <Loader2 className="size-10 animate-spin text-foreground/60" />
          <p className="text-sm text-muted-foreground">
            {autoLogging ? 'Выполняется вход...' : 'Загрузка...'}
          </p>
        </div>
      </div>
    );
  }

  if (user) return null;

  // --- Email Login View ---
  if (view === 'email-login') {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen bg-background overflow-hidden p-6">
        <div className="absolute inset-0 z-0">
          <Image
            src="/background.jpg"
            alt="background"
            fill
            className="object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
        <div className="w-full max-w-[320px] space-y-6 z-10">
          <button
            onClick={() => setView('main')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" /> Назад
          </button>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Вход</h2>
            <p className="text-sm text-muted-foreground">
              Войдите с помощью email и пароля
            </p>
          </div>

          <div className="space-y-3">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="bg-white/5 border-white/10"
            />
            <div className="relative">
              <Input
                type={showPass ? 'text' : 'password'}
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
                className="bg-white/5 border-white/10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPass ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>

            <Button
              className="w-full h-11"
              onClick={handleEmailLogin}
              disabled={emailLoading}
            >
              {emailLoading ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : null}
              Войти
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Нет аккаунта?{' '}
            <button
              onClick={() => setView('email-register')}
              className="text-primary font-medium hover:underline"
            >
              Зарегистрироваться
            </button>
          </p>
        </div>
      </div>
    );
  }

  // --- Email Register View ---
  if (view === 'email-register') {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen bg-background overflow-hidden p-6">
        <div className="absolute inset-0 z-0">
          <Image
            src="/background.jpg"
            alt="background"
            fill
            className="object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
        <div className="w-full max-w-[320px] space-y-6 z-10">
          <button
            onClick={() => setView('email-login')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" /> Назад
          </button>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Регистрация</h2>
            <p className="text-sm text-muted-foreground">
              Создайте аккаунт по email
            </p>
          </div>

          <div className="space-y-3">
            <Input
              type="text"
              placeholder="Ваше имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white/5 border-white/10"
            />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="bg-white/5 border-white/10"
            />
            <div className="relative">
              <Input
                type={showPass ? 'text' : 'password'}
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                onKeyDown={(e) => e.key === 'Enter' && handleEmailRegister()}
                className="bg-white/5 border-white/10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPass ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>

            <Button
              className="w-full h-11"
              onClick={handleEmailRegister}
              disabled={emailLoading}
            >
              {emailLoading ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : null}
              Создать аккаунт
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Уже есть аккаунт?{' '}
            <button
              onClick={() => setView('email-login')}
              className="text-primary font-medium hover:underline"
            >
              Войти
            </button>
          </p>
        </div>
      </div>
    );
  }

  // --- Главный экран ---
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-background overflow-hidden p-6">
      <div className="absolute inset-0 z-0">
        <Image
          src="/background.jpg"
          alt="background"
          fill
          className="object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      <div className="w-full max-w-[320px] space-y-8 text-center z-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Sibneuro</h1>
          <p className="text-sm text-muted-foreground">
            AI-платформа нового поколения
          </p>
        </div>

        <div className="space-y-3">
          {/* Telegram Widget */}
          <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="12" fill="#229ED9" />
                <path
                  d="M5.5 11.5l2.8 1 1.1 3.4 1.7-2 3.4 2.5 2.5-9.4-11.5 4.5z"
                  fill="white"
                />
                <path d="M8.3 12.5l.3 3.4 1.7-2" fill="#B0D8F5" />
              </svg>
              <span className="text-sm font-semibold">Telegram</span>
            </div>
            <LoginButton
              botUsername={
                process.env.NEXT_PUBLIC_TG_BOT_USERNAME || 'iamrdgbot'
              }
              onAuthCallback={handleTelegramAuth}
              showAvatar={false}
              buttonSize="large"
              cornerRadius={12}
              lang="ru"
            />
          </div>

          {/* Max Messenger */}
          <button
            onClick={handleMaxLogin}
            className="w-full flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/8 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="size-5 rounded-full bg-[#0077FF] flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-[11px]">M</span>
              </div>
              <span className="text-sm font-semibold">Max Messenger</span>
            </div>
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              Откройте сервис через мини-приложение в Max — вход произойдёт
              автоматически
            </p>
          </button>

          {/* Email */}
          <button
            onClick={() => setView('email-login')}
            className="w-full flex items-center justify-center gap-2.5 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/8 transition-colors"
          >
            <Mail className="size-4.5 text-muted-foreground" />
            <span className="text-sm font-semibold">Войти по Email</span>
          </button>

          {autoError && (
            <p className="text-xs text-red-400 text-center">
              Не удалось войти автоматически. Попробуйте через кнопку выше.
            </p>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground px-4 leading-relaxed">
          Продолжая, вы соглашаетесь с условиями использования и политикой
          конфиденциальности.
        </p>
      </div>
    </div>
  );
};

export default Login;
