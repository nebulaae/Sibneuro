'use client';

import api from '@/lib/api';
import Image from 'next/image';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { LoginButton } from '@telegram-auth/react';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState, useRef } from 'react';
import { Loader2, Mail, Eye, EyeOff, ArrowLeft } from 'lucide-react';

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

function saveSessionAuth(
  sessionHash: string,
  sessionData: { id: number; time: number },
  userInfo: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    name?: string;
  }
) {
  localStorage.setItem('session_hash', sessionHash);
  localStorage.setItem('session_data', JSON.stringify(sessionData));
  localStorage.setItem(
    'session_user',
    JSON.stringify({
      id: userInfo.id,
      first_name: userInfo.first_name || userInfo.name || 'User',
      last_name: userInfo.last_name,
      username: userInfo.username,
      photo_url: userInfo.photo_url,
      auth_date: 0,
    })
  );
  localStorage.setItem('auth_user_id', String(userInfo.id));
}

/* ─── Shared glass styles ─── */
const spring = 'all 0.28s cubic-bezier(0.32, 0.72, 0, 1)';

const glassCard: React.CSSProperties = {
  background: 'var(--glass-regular)',
  backdropFilter: 'blur(50px) saturate(180%) contrast(110%)',
  WebkitBackdropFilter: 'blur(50px) saturate(180%) contrast(110%)',
  border: 'var(--glass-border-regular)',
  boxShadow: 'var(--glass-specular), var(--glass-shadow-lg)',
  borderRadius: 22,
};

const glassInput: React.CSSProperties = {
  background: 'var(--glass-thin)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: 'var(--glass-border-thin)',
  boxShadow: 'var(--glass-specular)',
};

const glassButtonBlue: React.CSSProperties = {
  background: 'rgba(0,122,255,0.85)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(0,122,255,0.3)',
  boxShadow:
    'inset 0 1px 0 rgba(255,255,255,0.35), 0 6px 24px rgba(0,122,255,0.4)',
};

/* ─── Reusable glass input field ─── */
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
  <div style={{ position: 'relative' }}>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      autoComplete={autoComplete}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        padding: rightSlot ? '13px 48px 13px 16px' : '13px 16px',
        borderRadius: 14,
        fontSize: 16,
        outline: 'none',
        color: 'var(--sys-label)',
        fontFamily: 'var(--font-sf)',
        transition: 'all 0.22s cubic-bezier(0.32,0.72,0,1)',
        ...glassInput,
      }}
      onFocus={(e) => {
        e.currentTarget.style.border = '1px solid rgba(0,122,255,0.45)';
        e.currentTarget.style.boxShadow =
          'var(--glass-specular), 0 0 0 3px rgba(0,122,255,0.12)';
        e.currentTarget.style.background = 'var(--glass-regular)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.border = 'var(--glass-border-thin)';
        e.currentTarget.style.boxShadow = 'var(--glass-specular)';
        e.currentTarget.style.background = 'var(--glass-thin)';
      }}
    />
    {rightSlot && (
      <div
        style={{
          position: 'absolute',
          right: 14,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      >
        {rightSlot}
      </div>
    )}
  </div>
);

/* ─── Layout wrapper (keeps background intact) ─── */
const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100svh',
      overflowX: 'hidden',
      padding: '24px 20px',
    }}
  >
    {/* Background image — НЕ трогаем, только glass поверх */}
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      <Image
        src="/background.jpg"
        alt="background"
        fill
        className="object-cover opacity-25"
        priority
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to top, var(--page-bg) 0%, color-mix(in srgb, var(--page-bg) 55%, transparent) 50%, transparent 100%)',
        }}
      />
    </div>

    {/* Content */}
    <div
      style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 380 }}
    >
      {children}
    </div>
  </div>
);

/* ─── Main export ─── */
export const Login = () => {
  const router = useRouter();
  const { user, login, isLoading } = useAuth();
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

  useEffect(() => {
    if (!isLoading && user) router.replace('/');
  }, [user, isLoading, router]);
  useEffect(() => {
    setEnv(detectEnv());
  }, []);

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
        if (u?.id) localStorage.setItem('auth_user_id', String(u.id));
        login(u);
        router.replace('/');
      })
      .catch(() => {
        setAutoLogging(false);
        setAutoError(true);
        attempted.current = false;
      });
  }, [env, isLoading, user]);

  const handleTelegramAuth = async (tgUser: any) => {
    try {
      const { data } = await api.post('/api/auth/telegram', {
        ...tgUser,
        bot_id: process.env.NEXT_PUBLIC_BOT_ID,
      });
      localStorage.setItem('auth_token', data.token);
      if (data.user?.id)
        localStorage.setItem('auth_user_id', String(data.user.id));
      login(data.user);
      toast.success('Вход выполнен!');
      router.replace('/');
    } catch {
      toast.error('Ошибка входа через Telegram');
    }
  };

  const handleMaxLogin = () => {
    toast('Откройте приложение через Max Messenger для автоматического входа');
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error('Введите email и пароль');
      return;
    }
    setEmailLoading(true);
    try {
      const { data } = await api.post(
        `/api/auth/login/email?bot_id=${process.env.NEXT_PUBLIC_BOT_ID}`,
        { email: email.trim(), password }
      );
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        const u = data.user || { id: 0, first_name: 'User' };
        if (u.id) localStorage.setItem('auth_user_id', String(u.id));
        login(u);
        toast.success('Вход выполнен!');
        router.replace('/');
      } else if (data.session_hash && data.session_data) {
        const sessionData = data.session_data;
        saveSessionAuth(data.session_hash, sessionData, {
          id: sessionData.id,
          first_name: email.split('@')[0],
        });
        login({
          id: sessionData.id,
          first_name: email.split('@')[0],
          auth_date: 0,
        });
        toast.success('Вход выполнен!');
        router.replace('/');
      } else {
        throw new Error(data.error || 'Неверный ответ сервера');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Ошибка входа');
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
        `/api/auth/create/email?bot_id=${process.env.NEXT_PUBLIC_BOT_ID}`,
        { email: email.trim(), password, name: name.trim(), lang: 'ru' }
      );
      if (!data.success) throw new Error(data.error || 'Ошибка регистрации');
      toast.success('Аккаунт создан!');
      if (data.session_hash && data.session_data) {
        const sessionData = data.session_data;
        saveSessionAuth(data.session_hash, sessionData, {
          id: sessionData.id,
          first_name: name.trim(),
        });
        login({ id: sessionData.id, first_name: name.trim(), auth_date: 0 });
        router.replace('/');
      } else {
        setView('email-login');
        toast('Войдите с новым аккаунтом');
      }
    } catch (e: any) {
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

  /* ─── Loader ─── */
  if (isLoading || autoLogging) {
    return (
      <PageWrapper>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--glass-thick)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              border: 'var(--glass-border-thick)',
              boxShadow: 'var(--glass-specular), var(--glass-shadow-lg)',
            }}
          >
            <Loader2
              size={22}
              style={{
                animation: 'apple-spin 0.7s linear infinite',
                color: 'var(--sys-label-secondary)',
              }}
            />
          </div>
          <p style={{ fontSize: 14, color: 'var(--sys-label-secondary)' }}>
            {autoLogging ? 'Выполняется вход...' : 'Загрузка...'}
          </p>
        </div>
        <style>{`@keyframes apple-spin { to { transform: rotate(360deg); } }`}</style>
      </PageWrapper>
    );
  }

  if (user) return null;

  /* ─── Back button ─── */
  const BackBtn = ({ onClick }: { onClick: () => void }) => (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 15,
        fontWeight: 500,
        color: 'var(--tint-blue)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '6px 0',
        transition: spring,
        marginBottom: 24,
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <ArrowLeft size={17} /> Назад
    </button>
  );

  /* ─── Email Login ─── */
  if (view === 'email-login') {
    return (
      <PageWrapper>
        <BackBtn onClick={() => setView('main')} />

        <div style={{ marginBottom: 28 }}>
          <h2
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: '-0.6px',
              marginBottom: 4,
            }}
          >
            Вход
          </h2>
          <p style={{ fontSize: 14, color: 'var(--sys-label-secondary)' }}>
            Войдите с помощью email и пароля
          </p>
        </div>

        <div
          style={{
            ...glassCard,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
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
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  color: 'var(--sys-label-tertiary)',
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />

          <button
            onClick={handleEmailLogin}
            disabled={emailLoading}
            style={{
              width: '100%',
              padding: '14px 24px',
              borderRadius: 14,
              fontSize: 16,
              fontWeight: 700,
              ...glassButtonBlue,
              color: '#fff',
              cursor: 'pointer',
              transition: spring,
              marginTop: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: emailLoading ? 0.6 : 1,
            }}
            onMouseDown={(e) =>
              !emailLoading && (e.currentTarget.style.transform = 'scale(0.97)')
            }
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {emailLoading && (
              <Loader2
                size={16}
                style={{ animation: 'apple-spin 0.65s linear infinite' }}
              />
            )}
            Войти
          </button>
        </div>

        <p
          style={{
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--sys-label-secondary)',
            marginTop: 20,
          }}
        >
          Нет аккаунта?{' '}
          <button
            onClick={() => setView('email-register')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--tint-blue)',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Зарегистрироваться
          </button>
        </p>

        <style>{`@keyframes apple-spin { to { transform: rotate(360deg); } }`}</style>
      </PageWrapper>
    );
  }

  /* ─── Email Register ─── */
  if (view === 'email-register') {
    return (
      <PageWrapper>
        <BackBtn onClick={() => setView('email-login')} />

        <div style={{ marginBottom: 28 }}>
          <h2
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: '-0.6px',
              marginBottom: 4,
            }}
          >
            Регистрация
          </h2>
          <p style={{ fontSize: 14, color: 'var(--sys-label-secondary)' }}>
            Создайте аккаунт по email
          </p>
        </div>

        <div
          style={{
            ...glassCard,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
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
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  color: 'var(--sys-label-tertiary)',
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />

          <button
            onClick={handleEmailRegister}
            disabled={emailLoading}
            style={{
              width: '100%',
              padding: '14px 24px',
              borderRadius: 14,
              fontSize: 16,
              fontWeight: 700,
              ...glassButtonBlue,
              color: '#fff',
              cursor: 'pointer',
              transition: spring,
              marginTop: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: emailLoading ? 0.6 : 1,
            }}
            onMouseDown={(e) =>
              !emailLoading && (e.currentTarget.style.transform = 'scale(0.97)')
            }
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {emailLoading && (
              <Loader2
                size={16}
                style={{ animation: 'apple-spin 0.65s linear infinite' }}
              />
            )}
            Создать аккаунт
          </button>
        </div>

        <p
          style={{
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--sys-label-secondary)',
            marginTop: 20,
          }}
        >
          Уже есть аккаунт?{' '}
          <button
            onClick={() => setView('email-login')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--tint-blue)',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Войти
          </button>
        </p>

        <style>{`@keyframes apple-spin { to { transform: rotate(360deg); } }`}</style>
      </PageWrapper>
    );
  }

  /* ─── Main login screen ─── */
  return (
    <PageWrapper>
      {/* Logo / title */}
      <div style={{ textAlign: 'center', marginBottom: 44 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 22,
            marginInline: 'auto',
            marginBottom: 16,
            background: 'var(--glass-thick)',
            backdropFilter: 'blur(50px) saturate(180%)',
            WebkitBackdropFilter: 'blur(50px) saturate(180%)',
            border: 'var(--glass-border-regular)',
            boxShadow: 'var(--glass-specular), var(--glass-shadow-xl)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 30,
          }}
        >
          🧠
        </div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: '-0.8px',
            marginBottom: 4,
          }}
        >
          Sibneuro
        </h1>
        <p style={{ fontSize: 15, color: 'var(--sys-label-secondary)' }}>
          AI-платформа нового поколения
        </p>
      </div>

      {/* Auth methods */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Telegram widget */}
        <div style={{ ...glassCard, padding: '16px 20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="12" fill="#229ED9" />
              <path
                d="M5.5 11.5l2.8 1 1.1 3.4 1.7-2 3.4 2.5 2.5-9.4-11.5 4.5z"
                fill="white"
              />
              <path d="M8.3 12.5l.3 3.4 1.7-2" fill="#B0D8F5" />
            </svg>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Telegram</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
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
        </div>

        {/* Max Messenger */}
        <button
          onClick={handleMaxLogin}
          style={{
            ...glassCard,
            padding: '16px 20px',
            width: '100%',
            textAlign: 'left',
            cursor: 'pointer',
            transition: spring,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
          onMouseDown={(e) =>
            (e.currentTarget.style.transform = 'scale(0.985)')
          }
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#0077FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 11 }}>
                M
              </span>
            </div>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Max Messenger</span>
          </div>
          <p
            style={{
              fontSize: 13,
              color: 'var(--sys-label-secondary)',
              lineHeight: 1.4,
            }}
          >
            Откройте сервис через мини-приложение в Max — вход произойдёт
            автоматически
          </p>
        </button>

        {/* Email */}
        <button
          onClick={() => setView('email-login')}
          style={{
            ...glassCard,
            padding: '16px 20px',
            width: '100%',
            cursor: 'pointer',
            transition: spring,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
          onMouseDown={(e) =>
            (e.currentTarget.style.transform = 'scale(0.985)')
          }
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'var(--glass-thin)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: 'var(--glass-border-thin)',
              boxShadow: 'var(--glass-specular)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Mail size={16} style={{ color: 'var(--sys-label-secondary)' }} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Войти по Email</span>
        </button>

        {autoError && (
          <p style={{ textAlign: 'center', fontSize: 13, color: '#FF3B30' }}>
            Не удалось войти автоматически. Попробуйте через кнопку выше.
          </p>
        )}
      </div>

      <p
        style={{
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--sys-label-tertiary)',
          marginTop: 28,
          lineHeight: 1.5,
        }}
      >
        Продолжая, вы соглашаетесь с условиями использования и политикой
        конфиденциальности.
      </p>
    </PageWrapper>
  );
};

export default Login;
