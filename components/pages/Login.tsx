'use client';

import api from '@/lib/api';
import Image from 'next/image';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { LoginButton } from '@telegram-auth/react';
import { useAuth } from '@/hooks/useAuth';
import { useBot } from '@/app/providers/BotProvider';
import { useEffect, useState, useRef } from 'react';
import { Loader2, Mail, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';
import { cn } from '@/lib/utils';

type AppEnv = 'telegram' | 'max' | 'browser';
type LoginView = 'main' | 'email-login' | 'email-register';

function detectEnv(): AppEnv {
  if (typeof window === 'undefined') return 'browser';
  const tg = (window as any)?.Telegram?.WebApp;
  if (tg?.initData) return 'telegram';
  const maxWA = (window as any)?.WebApp;
  if (maxWA?.initData) return 'max';
  return 'browser';
}

function getMaxInitData(): string | null {
  return (window as any)?.WebApp?.initData || null;
}

function saveSessionAuth(
  hash: string,
  sd: { id: number; time: number },
  u: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    name?: string;
  }
) {
  localStorage.setItem('session_hash', hash);
  localStorage.setItem('session_data', JSON.stringify(sd));
  localStorage.setItem(
    'session_user',
    JSON.stringify({
      id: u.id,
      first_name: u.first_name || u.name || 'User',
      last_name: u.last_name,
      username: u.username,
      photo_url: u.photo_url,
      auth_date: 0,
    })
  );
  localStorage.setItem('auth_user_id', String(u.id));
}

/* ── Shared classes ── */
const glassCard = cn(
  'bg-white/[.10] dark:bg-black/[.55] backdrop-blur-[50px] backdrop-saturate-180',
  'border border-white/[.18]',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.20),0_8px_32px_rgba(0,0,0,0.28)]',
  'rounded-[22px]'
);
const glassThin = cn(
  'bg-white/[.07] dark:bg-black/[.45] backdrop-blur-xl backdrop-saturate-150',
  'border border-white/[.14]',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
);
const glassBlue = cn(
  'bg-[rgba(0,122,255,0.85)] backdrop-blur-xl',
  'border border-[rgba(0,122,255,0.30)]',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_24px_rgba(0,122,255,0.40)]'
);
const spring =
  'transition-all duration-[280ms] [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]';

const GlassInput = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  onKeyDown,
  autoComplete,
  rightSlot,
}: {
  type?: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  rightSlot?: React.ReactNode;
}) => (
  <div className="relative">
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      autoComplete={autoComplete}
      className={cn(
        'w-full box-border py-[13px] rounded-[14px] text-[16px] outline-none text-white',
        rightSlot ? 'pl-4 pr-12' : 'px-4',
        glassThin,
        spring,
        'placeholder:text-white/30',
        'focus:border-[rgba(0,122,255,0.45)] focus:shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_0_0_3px_rgba(0,122,255,0.12)] focus:bg-white/[.10]'
      )}
    />
    {rightSlot && (
      <div className="absolute right-[14px] top-1/2 -translate-y-1/2">
        {rightSlot}
      </div>
    )}
  </div>
);

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="relative flex flex-col items-center justify-center min-h-[100svh] overflow-x-hidden px-5 py-6">
    <div className="absolute inset-0 z-0 pointer-events-none">
      <Image
        src="/background.jpg"
        alt="background"
        fill
        className="object-cover opacity-25"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--page-bg)] via-[color-mix(in_srgb,var(--page-bg)_55%,transparent)] to-transparent" />
    </div>
    <div className="relative z-10 w-full max-w-[380px]">{children}</div>
  </div>
);

export const Login = () => {
  const router = useRouter();
  const { user, login, isLoading: authLoading } = useAuth();
  const { bot, isLoading: botLoading } = useBot(); // 👈
  const haptic = useHaptic();
  const [env, setEnv] = useState<AppEnv>('browser');
  const [autoLogging, setAutoLogging] = useState(false);
  const [autoError, setAutoError] = useState(false);
  const [view, setView] = useState<LoginView>('main');
  const attempted = useRef(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [name, setName] = useState('');

  const isLoading = authLoading || botLoading;

  useEffect(() => {
    if (!authLoading && user) router.replace('/');
  }, [user, authLoading, router]);

  useEffect(() => {
    setEnv(detectEnv());
  }, []);

  useEffect(() => {
    if (env !== 'max') return;
    const maxWA = (window as any)?.WebApp;
    if (!maxWA) return;
    try {
      maxWA.ready?.();
      maxWA.expand?.();
    } catch {}
  }, [env]);

  // Авто-вход через TMA — ждём пока bot загрузится
  useEffect(() => {
    if (env === 'browser' || attempted.current || authLoading || user) return;
    if (!bot?.bot_id) return; // 👈 ждём bot_id

    const tg = (window as any)?.Telegram?.WebApp;
    const initData = env === 'telegram' ? tg?.initData : getMaxInitData();
    if (!initData) return;

    attempted.current = true;
    setAutoLogging(true);

    if (env === 'telegram') {
      try {
        tg.ready();
        tg.expand();
      } catch {}
    }

    api
      .post('/api/auth/tma', {
        initData,
        platform: env,
        bot_id: bot.bot_id, // 👈 динамически
      })
      .then(({ data }) => {
        localStorage.setItem('auth_token', data.token);
        if (data.user?.id)
          localStorage.setItem('auth_user_id', String(data.user.id));
        login(data.user);
        router.replace('/');
      })
      .catch(() => {
        setAutoLogging(false);
        setAutoError(true);
        attempted.current = false;
      });
  }, [env, authLoading, user, bot]); // 👈 зависимость от bot

  const handleTelegramAuth = async (tgUser: any) => {
    try {
      const { data } = await api.post('/api/auth/telegram', {
        ...tgUser,
        bot_id: bot?.bot_id, // 👈 динамически
      });
      localStorage.setItem('auth_token', data.token);
      if (data.user?.id)
        localStorage.setItem('auth_user_id', String(data.user.id));
      login(data.user);
      haptic.success();
      toast.success('Вход выполнен!');
      router.replace('/');
    } catch {
      haptic.error();
      toast.error('Ошибка входа через Telegram');
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error('Введите email и пароль');
      return;
    }
    setEmailLoading(true);
    try {
      const { data } = await api.post(
        `/api/auth/login/email?bot_id=${bot?.bot_id}`, // 👈 динамически
        { email: email.trim(), password }
      );
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        const u = data.user || { id: 0, first_name: email.split('@')[0] };
        if (u.id) localStorage.setItem('auth_user_id', String(u.id));
        login(u);
        haptic.success();
        toast.success('Вход выполнен!');
        router.replace('/');
      } else if (data.session_hash && data.session_data) {
        const sd =
          typeof data.session_data === 'string'
            ? JSON.parse(data.session_data)
            : data.session_data;
        const displayName =
          data.user?.name || data.user?.first_name || email.split('@')[0];
        saveSessionAuth(data.session_hash, sd, {
          id: sd.id,
          first_name: displayName,
          photo_url: data.user?.photo_url,
        });
        login({ id: sd.id, first_name: displayName, auth_date: 0 });
        haptic.success();
        toast.success('Вход выполнен!');
        router.replace('/');
      } else throw new Error(data.error || 'Неверный ответ сервера');
    } catch (e: any) {
      haptic.error();
      const msg =
        e?.response?.status === 401
          ? 'Неверный email или пароль'
          : e?.response?.data?.error || e?.message || 'Ошибка входа';
      toast.error(msg);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleEmailRegister = async () => {
    if (!email.trim() || !password.trim() || !name.trim()) {
      toast.error('Заполните все поля');
      return;
    }
    setEmailLoading(true);
    try {
      const { data } = await api.post(
        `/api/auth/create/email?bot_id=${bot?.bot_id}`, // 👈 динамически
        { email: email.trim(), password, name: name.trim(), lang: 'ru' }
      );
      if (!data.success) throw new Error(data.error || 'Ошибка регистрации');
      haptic.success();
      toast.success('Аккаунт создан!');
      if (data.session_hash && data.session_data) {
        const sd =
          typeof data.session_data === 'string'
            ? JSON.parse(data.session_data)
            : data.session_data;
        saveSessionAuth(data.session_hash, sd, {
          id: sd.id,
          first_name: name.trim(),
        });
        login({ id: sd.id, first_name: name.trim(), auth_date: 0 });
        router.replace('/');
      } else {
        setView('email-login');
        toast('Войдите с новым аккаунтом');
      }
    } catch (e: any) {
      haptic.error();
      if (e?.response?.status === 409)
        toast.error('Пользователь с таким email уже существует');
      else
        toast.error(
          e?.response?.data?.error || e?.message || 'Ошибка регистрации'
        );
    } finally {
      setEmailLoading(false);
    }
  };

  if (isLoading || autoLogging)
    return (
      <PageWrapper>
        <div className="flex flex-col items-center gap-4">
          <div
            className={cn(
              'w-[52px] h-[52px] rounded-[18px] flex items-center justify-center',
              'bg-white/[.13] dark:bg-black/[.65] backdrop-blur-3xl border border-white/[.22]',
              'shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_32px_rgba(0,0,0,0.28)]'
            )}
          >
            <Loader2 size={22} className="animate-spin text-white/50" />
          </div>
          <p className="text-[14px] text-white/50">
            {autoLogging ? 'Выполняется вход...' : 'Загрузка...'}
          </p>
        </div>
      </PageWrapper>
    );

  if (user) return null;

  const BackBtn = ({ onClick }: { onClick: () => void }) => (
    <button
      onClick={() => {
        haptic.light();
        onClick();
      }}
      className={cn(
        'inline-flex items-center gap-1 text-[15px] font-medium text-[#0A84FF] bg-none border-none cursor-pointer py-1.5 mb-6',
        spring,
        'active:scale-[0.92]'
      )}
    >
      <ArrowLeft size={17} /> Назад
    </button>
  );

  if (view === 'email-login')
    return (
      <PageWrapper>
        <BackBtn onClick={() => setView('main')} />
        <div className="mb-7">
          <h2 className="text-[28px] font-bold tracking-[-0.6px] mb-1">Вход</h2>
          <p className="text-[14px] text-white/50">
            Войдите с помощью email и пароля
          </p>
        </div>
        <div className={cn(glassCard, 'p-5 flex flex-col gap-3')}>
          <GlassInput
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <GlassInput
            type={showPass ? 'text' : 'password'}
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="bg-none border-none cursor-pointer flex text-white/30"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />
          <button
            onClick={handleEmailLogin}
            disabled={emailLoading}
            className={cn(
              'w-full py-[14px] rounded-[14px] text-[16px] font-bold text-white mt-1 flex items-center justify-center gap-2',
              glassBlue,
              spring,
              'active:scale-[0.97]',
              emailLoading && 'opacity-60'
            )}
          >
            {emailLoading && <Loader2 size={16} className="animate-spin" />}{' '}
            Войти
          </button>
        </div>
        <p className="text-center text-[13px] text-white/50 mt-5">
          Нет аккаунта?{' '}
          <button
            onClick={() => {
              haptic.light();
              setView('email-register');
            }}
            className="bg-none border-none cursor-pointer text-[#0A84FF] font-semibold text-[13px]"
          >
            Зарегистрироваться
          </button>
        </p>
      </PageWrapper>
    );

  if (view === 'email-register')
    return (
      <PageWrapper>
        <BackBtn onClick={() => setView('email-login')} />
        <div className="mb-7">
          <h2 className="text-[28px] font-bold tracking-[-0.6px] mb-1">
            Регистрация
          </h2>
          <p className="text-[14px] text-white/50">Создайте аккаунт по email</p>
        </div>
        <div className={cn(glassCard, 'p-5 flex flex-col gap-3')}>
          <GlassInput
            type="text"
            placeholder="Ваше имя"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <GlassInput
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <GlassInput
            type={showPass ? 'text' : 'password'}
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            onKeyDown={(e) => e.key === 'Enter' && handleEmailRegister()}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="bg-none border-none cursor-pointer flex text-white/30"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />
          <button
            onClick={handleEmailRegister}
            disabled={emailLoading}
            className={cn(
              'w-full py-[14px] rounded-[14px] text-[16px] font-bold text-white mt-1 flex items-center justify-center gap-2',
              glassBlue,
              spring,
              'active:scale-[0.97]',
              emailLoading && 'opacity-60'
            )}
          >
            {emailLoading && <Loader2 size={16} className="animate-spin" />}{' '}
            Создать аккаунт
          </button>
        </div>
        <p className="text-center text-[13px] text-white/50 mt-5">
          Уже есть аккаунт?{' '}
          <button
            onClick={() => {
              haptic.light();
              setView('email-login');
            }}
            className="bg-none border-none cursor-pointer text-[#0A84FF] font-semibold text-[13px]"
          >
            Войти
          </button>
        </p>
      </PageWrapper>
    );

  return (
    <PageWrapper>
      <div className="text-center mb-11">
        <div
          className={cn(
            'w-[72px] h-[72px] rounded-[22px] mx-auto mb-4 flex items-center justify-center text-[30px]',
            'bg-white/[.13] dark:bg-black/[.65] backdrop-blur-3xl',
            'border border-white/[.22]',
            'shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_32px_rgba(0,0,0,0.38)]'
          )}
        >
          🧠
        </div>
        <h1 className="text-[32px] font-extrabold tracking-[-0.8px] mb-1">
          Sibneuro
        </h1>
        <p className="text-[15px] text-white/50">
          AI-платформа нового поколения
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {/* Telegram — LoginButton использует bot_username без @ */}
        <div className={cn(glassCard, 'p-5')}>
          <div className="flex items-center gap-2 mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="12" fill="#229ED9" />
              <path
                d="M5.5 11.5l2.8 1 1.1 3.4 1.7-2 3.4 2.5 2.5-9.4-11.5 4.5z"
                fill="white"
              />
              <path d="M8.3 12.5l.3 3.4 1.7-2" fill="#B0D8F5" />
            </svg>
            <span className="text-[15px] font-semibold">Telegram</span>
          </div>
          {/* Рендерим LoginButton только когда bot_username готов */}
          {bot?.bot_username ? (
            <div className="flex justify-center">
              <LoginButton
                botUsername={bot.bot_username} // 👈 динамически, без @
                onAuthCallback={handleTelegramAuth}
                showAvatar={false}
                buttonSize="large"
                cornerRadius={12}
                lang="ru"
              />
            </div>
          ) : (
            <div className="flex justify-center py-2">
              <Loader2 size={20} className="animate-spin text-white/30" />
            </div>
          )}
        </div>

        {/* Max */}
        <button
          onClick={() => {
            haptic.light();
            toast(
              'Откройте приложение через Max Messenger для автоматического входа'
            );
          }}
          className={cn(
            glassCard,
            'p-5 w-full text-left cursor-pointer flex flex-col gap-1.5',
            spring,
            'active:scale-[0.985]'
          )}
        >
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#0077FF] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-[11px]">M</span>
            </div>
            <span className="text-[15px] font-semibold">Max Messenger</span>
          </div>
          <p className="text-[13px] text-white/50 leading-[1.4]">
            Откройте сервис через мини-приложение в Max — вход произойдёт
            автоматически
          </p>
        </button>

        {/* Email */}
        <button
          onClick={() => {
            haptic.light();
            setView('email-login');
          }}
          className={cn(
            glassCard,
            'p-5 w-full cursor-pointer flex items-center gap-2.5',
            spring,
            'active:scale-[0.985]'
          )}
        >
          <div
            className={cn(
              'w-[34px] h-[34px] rounded-[10px] flex items-center justify-center flex-shrink-0',
              glassThin
            )}
          >
            <Mail size={16} className="text-white/50" />
          </div>
          <span className="text-[15px] font-semibold">Войти по Email</span>
        </button>

        {autoError && (
          <p className="text-center text-[13px] text-[#FF3B30]">
            Не удалось войти автоматически. Попробуйте через кнопку выше.
          </p>
        )}
      </div>

      <p className="text-center text-[12px] text-white/30 mt-7 leading-[1.5]">
        Продолжая, вы соглашаетесь с условиями использования и политикой
        конфиденциальности.
      </p>
    </PageWrapper>
  );
};

export default Login;
