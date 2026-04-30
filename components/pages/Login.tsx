'use client';

import api from '@/lib/api';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { LoginButton } from '@telegram-auth/react';
import { useAuth } from '@/hooks/useAuth';
import { useBot } from '@/app/providers/BotProvider';
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Loader2,
  Mail,
  Eye,
  EyeOff,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';
import { cn } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';

import { getAppSource, setAppSource } from '@/lib/source';
import { getPlatformInitData, waitForPlatformInitData } from '@/lib/platform';
import Link from 'next/link';
import Image from 'next/image';

type AppEnv = 'telegram' | 'max' | 'browser';
type LoginView = 'main' | 'email-login' | 'email-register';

function saveSessionAuth(
  hash: string,
  sd: { id: number; time: number },
  u: any
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

/* ─── Design tokens ─── */
const g = {
  card: 'bg-zinc-900/55 backdrop-blur-[50px] backdrop-saturate-180 border border-white/[.11] shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_8px_32px_rgba(0,0,0,0.35)] rounded-[22px]',
  thin: 'bg-zinc-900/40 backdrop-blur-xl border border-white/[.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]',
  primary:
    'bg-white/[.10] backdrop-blur-xl border border-white/[.20] shadow-[inset_0_1px_0_rgba(255,255,255,0.20),0_6px_24px_rgba(0,0,0,0.25)]',
};
const spring =
  'transition-all duration-[260ms] [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]';

const GlassInput = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  onKeyDown,
  autoComplete,
  rightSlot,
}: any) => (
  <div className="relative">
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      autoComplete={autoComplete}
      className={cn(
        'w-full box-border py-[13px] rounded-[14px] text-[15px] outline-none text-white/90',
        rightSlot ? 'pl-4 pr-11' : 'px-4',
        g.thin,
        spring,
        'placeholder:text-white/25',
        'focus:border-white/[.22] focus:bg-white/[.07]'
      )}
    />
    {rightSlot && (
      <div className="absolute right-[13px] top-1/2 -translate-y-1/2">
        {rightSlot}
      </div>
    )}
  </div>
);

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="relative flex flex-col items-center justify-center min-h-[100svh] overflow-x-hidden px-5 py-8">
    <div className="absolute inset-0 z-0 pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/30" />
    </div>
    <div className="relative z-10 w-full max-w-[360px]">{children}</div>
  </div>
);

/* ─── Messenger launch card ─── */
const MessengerCard = ({
  href,
  icon,
  label,
  sublabel,
  accentColor,
  onClick,
}: {
  href?: string;
  icon: string;
  label: string;
  sublabel: string;
  accentColor: string;
  onClick?: () => void;
}) => {
  const inner = (
    <div
      className={cn(
        g.card,
        'p-4 w-full flex items-center gap-3.5 cursor-pointer select-none',
        spring,
        'active:scale-[0.975]',
        'hover:border-white/[.18] hover:bg-zinc-900/65'
      )}
      onClick={onClick}
    >
      {/* Icon bubble */}
      <div
        className={cn(
          'w-11 h-11 rounded-[14px] flex items-center justify-center flex-shrink-0',
          accentColor
        )}
      >
        <Image src={icon} width={24} height={24} alt={label} />
      </div>

      {/* Text */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-[14px] font-semibold text-white/85 leading-none mb-[5px]">
          {label}
        </span>
        <span className="text-[12px] text-white/40 leading-[1.35] truncate">
          {sublabel}
        </span>
      </div>

      {/* Arrow */}
      <ExternalLink size={13} className="text-white/20 flex-shrink-0" />
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="no-underline"
      >
        {inner}
      </Link>
    );
  }
  return inner;
};

/* ─── Telegram SVG icon ─── */
const TelegramIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path
      d="M21.8 3.3L18.6 19.5c-.2 1-.9 1.3-1.8.8l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.4-8.5c.4-.4-.1-.6-.6-.2L5.8 14.5l-4.9-1.5c-1.1-.3-1.1-1.1.2-1.6l19.1-7.4c.9-.3 1.7.2 1.6 1.3z"
      fill="white"
      fillOpacity="0.85"
    />
  </svg>
);

/* ─── Max SVG icon ─── */
const MaxIcon = () => (
  <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
    <path
      d="M6 8h20M6 16h14M6 24h20"
      stroke="white"
      strokeOpacity="0.85"
      strokeWidth="2.8"
      strokeLinecap="round"
    />
    <circle cx="26" cy="16" r="3.5" fill="white" fillOpacity="0.5" />
  </svg>
);

export const Login = () => {
  const router = useRouter();
  const { user, login, isLoading: authLoading } = useAuth();
  const { bot, isLoading: botLoading } = useBot();
  const haptic = useHaptic();
  const t = useTranslations('Login');
  const locale = useLocale();

  const [source, setSource] = useState<string | null>(null);
  const [autoLogging, setAutoLogging] = useState(false);
  const [autoError, setAutoError] = useState(false);
  const [view, setView] = useState<LoginView>('main');

  const attempted = useRef(false);
  const retryCount = useRef(0);
  const MAX_RETRIES = 3;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [name, setName] = useState('');
  const isLoading = authLoading || botLoading;

  const botInfo = JSON.parse(localStorage.getItem('bot_info') || '{}');
  const maxBotUsername = botInfo?.max_username;
  const telegramBotUsername = botInfo?.bot_username;

  useEffect(() => {
    if (!authLoading && user) router.replace('/');
  }, [user, authLoading, router]);

  useEffect(() => {
    const syncSource = getAppSource();
    if (syncSource) {
      setSource(syncSource);
      return;
    }
    let cancelled = false;
    const timer = setInterval(() => {
      if (cancelled) return;
      const s = getAppSource();
      if (s) {
        clearInterval(timer);
        setSource(s);
      }
    }, 100);
    const timeout = setTimeout(() => {
      clearInterval(timer);
      if (!cancelled && !source) setSource(getAppSource());
    }, 2000);
    return () => {
      cancelled = true;
      clearInterval(timer);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (source !== 'max') return;
    try {
      const w = (window as any)?.WebApp;
      w?.ready?.();
      w?.expand?.();
    } catch {}
  }, [source]);

  useEffect(() => {
    if (source !== 'tg') return;
    try {
      (window as any)?.Telegram?.WebApp?.ready?.();
      (window as any)?.Telegram?.WebApp?.expand?.();
    } catch {}
  }, [source]);

  const attemptTMALogin = useCallback(async () => {
    if (!source || source === 'browser') return;
    if (authLoading || user) return;
    if (!bot?.bot_id) return;
    if (attempted.current) return;
    if (retryCount.current >= MAX_RETRIES) return;

    attempted.current = true;
    retryCount.current++;
    setAutoLogging(true);
    setAutoError(false);

    const env = source === 'tg' ? 'telegram' : (source as AppEnv);

    try {
      if (source === 'tg') {
        (window as any)?.Telegram?.WebApp?.ready?.();
        (window as any)?.Telegram?.WebApp?.expand?.();
      } else if (source === 'max') {
        (window as any)?.WebApp?.ready?.();
        (window as any)?.WebApp?.expand?.();
      }
    } catch {}

    const initData = await waitForPlatformInitData(8000);

    if (!initData) {
      attempted.current = false;
      if (retryCount.current < MAX_RETRIES) {
        setAutoLogging(false);
        setTimeout(() => attemptTMALogin(), 1000);
      } else {
        setAutoLogging(false);
        setAutoError(true);
      }
      return;
    }

    try {
      const { data } = await api.post(
        '/api/auth/tma',
        { initData, platform: env, bot_id: bot.bot_id },
        {
          headers: {
            'x-init-data': initData,
            'x-bot-id': String(bot.bot_id),
            'x-platform': env,
          },
        }
      );
      localStorage.setItem('auth_token', data.token);
      if (data.user?.id)
        localStorage.setItem('auth_user_id', String(data.user.id));
      login(data.user);
      router.replace('/');
    } catch {
      attempted.current = false;
      if (retryCount.current < MAX_RETRIES) {
        setAutoLogging(false);
        setTimeout(() => attemptTMALogin(), 1500);
      } else {
        setAutoLogging(false);
        setAutoError(true);
      }
    }
  }, [source, authLoading, user, bot, login, router]);

  useEffect(() => {
    if (
      !source ||
      source === 'browser' ||
      authLoading ||
      user ||
      !bot?.bot_id ||
      attempted.current
    )
      return;
    if (localStorage.getItem('auth_token')) return;
    attemptTMALogin();
  }, [source, authLoading, user, bot, attemptTMALogin]);

  const handleTelegramAuth = async (tgUser: any) => {
    try {
      const { data } = await api.post('/api/auth/telegram', {
        ...tgUser,
        bot_id: bot?.bot_id,
      });
      localStorage.setItem('auth_token', data.token);
      if (data.user?.id)
        localStorage.setItem('auth_user_id', String(data.user.id));
      login(data.user);
      haptic.success();
      toast.success(t('loginSuccess'));
      router.replace('/');
    } catch {
      haptic.error();
      toast.error(t('loginError'));
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error(t('emailRequired'));
      return;
    }
    setEmailLoading(true);
    try {
      const { data } = await api.post(
        `/api/auth/login/email?bot_id=${bot?.bot_id}`,
        {
          email: email.trim(),
          password,
          initData: getPlatformInitData(),
        }
      );
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        const u = data.user || { id: 0, first_name: email.split('@')[0] };
        if (u.id) localStorage.setItem('auth_user_id', String(u.id));
        login(u);
        haptic.success();
        toast.success(t('loginSuccess'));
        router.replace('/');
      } else if (data.session_hash && data.session_data) {
        const sd =
          typeof data.session_data === 'string'
            ? JSON.parse(data.session_data)
            : data.session_data;
        const dn =
          data.user?.name || data.user?.first_name || email.split('@')[0];
        saveSessionAuth(data.session_hash, sd, {
          id: sd.id,
          first_name: dn,
          photo_url: data.user?.photo_url,
        });
        login({ id: sd.id, first_name: dn, auth_date: 0 });
        haptic.success();
        toast.success(t('loginSuccess'));
        router.replace('/');
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (e: any) {
      haptic.error();
      const msg =
        e?.response?.status === 401
          ? t('invalidCredentials')
          : e?.response?.data?.error || e?.message || t('emailRequired');
      toast.error(msg);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleEmailRegister = async () => {
    if (!email.trim() || !password.trim() || !name.trim()) {
      toast.error(t('emailEmpty'));
      return;
    }
    setEmailLoading(true);
    try {
      const { data } = await api.post(
        `/api/auth/create/email?bot_id=${bot?.bot_id}`,
        {
          email: email.trim(),
          password,
          name: name.trim(),
          lang: locale,
          initData: getPlatformInitData(),
        }
      );
      if (!data.success) throw new Error(data.error || 'Register error');
      haptic.success();
      toast.success(t('registerSuccess'));
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
      }
    } catch (e: any) {
      haptic.error();
      if (e?.response?.status === 409) toast.error(t('emailExists'));
      else
        toast.error(e?.response?.data?.error || e?.message || t('emailEmpty'));
    } finally {
      setEmailLoading(false);
    }
  };

  const handleRetryAutoLogin = () => {
    if (attempted.current) return;
    retryCount.current = 0;
    setAutoError(false);
    attemptTMALogin();
  };

  if (isLoading || autoLogging) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center gap-3">
          <div
            className={cn(
              'w-12 h-12 rounded-2xl flex items-center justify-center',
              g.card
            )}
          >
            <Loader2 size={20} className="animate-spin text-white/40" />
          </div>
          <p className="text-[13px] text-white/40">{t('autoLoginLoading')}</p>
        </div>
      </PageWrapper>
    );
  }

  if (user) return null;

  const BackBtn = ({ onClick }: { onClick: () => void }) => (
    <button
      onClick={() => {
        haptic.light();
        onClick();
      }}
      className={cn(
        'inline-flex items-center gap-1.5 text-[14px] font-medium text-white/50 bg-transparent border-none cursor-pointer py-1.5 mb-6',
        spring,
        'active:scale-[0.94]'
      )}
    >
      <ArrowLeft size={15} /> {t('back')}
    </button>
  );

  if (view === 'email-login') {
    return (
      <PageWrapper>
        <BackBtn onClick={() => setView('main')} />
        <div className="mb-7">
          <h2 className="text-[26px] font-bold tracking-[-0.5px] mb-1 text-white/90">
            {t('emailLoginTitle')}
          </h2>
          <p className="text-[13px] text-white/40">{t('emailLoginSubtitle')}</p>
        </div>
        <div className={cn(g.card, 'p-5 flex flex-col gap-3')}>
          <GlassInput
            type="email"
            placeholder={t('emailPlaceholder')}
            value={email}
            onChange={(e: any) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <GlassInput
            type={showPass ? 'text' : 'password'}
            placeholder={t('passwordPlaceholder')}
            value={password}
            onChange={(e: any) => setPassword(e.target.value)}
            autoComplete="current-password"
            onKeyDown={(e: any) => e.key === 'Enter' && handleEmailLogin()}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="text-white/30 bg-transparent border-none cursor-pointer flex"
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            }
          />
          <button
            onClick={handleEmailLogin}
            disabled={emailLoading}
            className={cn(
              'w-full py-[13px] rounded-[14px] text-[15px] font-semibold text-white/90 mt-1 flex items-center justify-center gap-2',
              g.primary,
              spring,
              'active:scale-[0.97]',
              emailLoading && 'opacity-50'
            )}
          >
            {emailLoading && <Loader2 size={15} className="animate-spin" />}{' '}
            {t('signIn')}
          </button>
        </div>
        <p className="text-center text-[12px] text-white/35 mt-5">
          {t('noAccount')}{' '}
          <button
            onClick={() => {
              haptic.light();
              setView('email-register');
            }}
            className="bg-transparent border-none cursor-pointer text-white/60 font-semibold text-[12px]"
          >
            {t('register')}
          </button>
        </p>
      </PageWrapper>
    );
  }

  if (view === 'email-register') {
    return (
      <PageWrapper>
        <BackBtn onClick={() => setView('email-login')} />
        <div className="mb-7">
          <h2 className="text-[26px] font-bold tracking-[-0.5px] mb-1 text-white/90">
            {t('registerTitle')}
          </h2>
          <p className="text-[13px] text-white/40">{t('registerSubtitle')}</p>
        </div>
        <div className={cn(g.card, 'p-5 flex flex-col gap-3')}>
          <GlassInput
            type="text"
            placeholder={t('namePlaceholder')}
            value={name}
            onChange={(e: any) => setName(e.target.value)}
          />
          <GlassInput
            type="email"
            placeholder={t('emailPlaceholder')}
            value={email}
            onChange={(e: any) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <GlassInput
            type={showPass ? 'text' : 'password'}
            placeholder={t('passwordPlaceholder')}
            value={password}
            onChange={(e: any) => setPassword(e.target.value)}
            autoComplete="new-password"
            onKeyDown={(e: any) => e.key === 'Enter' && handleEmailRegister()}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="text-white/30 bg-transparent border-none cursor-pointer flex"
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            }
          />
          <button
            onClick={handleEmailRegister}
            disabled={emailLoading}
            className={cn(
              'w-full py-[13px] rounded-[14px] text-[15px] font-semibold text-white/90 mt-1 flex items-center justify-center gap-2',
              g.primary,
              spring,
              'active:scale-[0.97]',
              emailLoading && 'opacity-50'
            )}
          >
            {emailLoading && <Loader2 size={15} className="animate-spin" />}{' '}
            {t('createAccount')}
          </button>
        </div>
        <p className="text-center text-[12px] text-white/35 mt-5">
          {t('alreadyHaveAccount')}{' '}
          <button
            onClick={() => {
              haptic.light();
              setView('email-login');
            }}
            className="bg-transparent border-none cursor-pointer text-white/60 font-semibold text-[12px]"
          >
            {t('signIn')}
          </button>
        </p>
      </PageWrapper>
    );
  }

  /* ─── Determine app env for main view ─── */
  const isBrowser = !source || source === 'browser';
  const isTg = source === 'tg';
  const isMax = source === 'max';

  return (
    <PageWrapper>
      {/* Hero */}
      <div className="text-center mb-10">
        <div
          className={cn(
            'w-16 h-16 rounded-[22px] mx-auto mb-5 flex items-center justify-center',
            g.card
          )}
        >
          <span className="text-[26px]">🧠</span>
        </div>
        <h1 className="text-[30px] font-extrabold tracking-[-0.7px] mb-1.5 text-white/90">
          Sibneuro
        </h1>
        <p className="text-[14px] text-white/40">{t('tagline')}</p>
      </div>

      <div className="flex flex-col gap-3">
        {/* ─── Browser: open in messenger cards ─── */}
        {isBrowser && (
          <>
            {/* Section label */}
            <p className="text-[11px] font-semibold text-white/30 uppercase tracking-[0.08em] px-1 mb-0.5">
              {t('openInApp')}
            </p>

            {telegramBotUsername && (
              <MessengerCard
                href={`https://t.me/${telegramBotUsername}`}
                icon={'/telegram.png'}
                label={t('openInTelegram')}
                sublabel={t('openInTelegramSub')}
                accentColor="bg-[#229ED9]/20"
              />
            )}

            {maxBotUsername && (
              <MessengerCard
                href={`https://max.ru/${maxBotUsername}`}
                icon={'/max.png'}
                label={t('openInMax')}
                sublabel={t('openInMaxSub')}
                accentColor="bg-violet-500/15"
              />
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-white/[.07]" />
              <span className="text-[11px] text-white/25">
                {t('orContinueWith')}
              </span>
              <div className="flex-1 h-px bg-white/[.07]" />
            </div>
          </>
        )}

        {/* ─── Telegram Widget (browser + tg source) ─── */}
        {isTg && (
          <div className={cn(g.card, 'p-5')}>
            <div className="flex items-center gap-2 mb-3.5">
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                <TelegramIcon />
              </div>
              <span className="text-[14px] font-semibold text-white/80">
                {t('telegramSection')}
              </span>
            </div>
            {bot?.bot_username ? (
              <div className="flex justify-center">
                <LoginButton
                  botUsername={bot.bot_username}
                  onAuthCallback={handleTelegramAuth}
                  showAvatar={false}
                  buttonSize="large"
                  cornerRadius={12}
                  lang={locale === 'ru' ? 'ru' : 'en'}
                />
              </div>
            ) : (
              <div className="flex justify-center py-1.5">
                <Loader2 size={18} className="animate-spin text-white/25" />
              </div>
            )}
          </div>
        )}

        {/* ─── Max (inside Max app) ─── */}
        {isMax && (
          <button
            onClick={() => {
              haptic.light();
              toast(t('maxToast'));
            }}
            className={cn(
              g.card,
              'p-5 w-full text-left cursor-pointer flex flex-col gap-1.5',
              spring,
              'active:scale-[0.985]'
            )}
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-white/80 font-bold text-[10px]">M</span>
              </div>
              <span className="text-[14px] font-semibold text-white/80">
                {t('maxSection')}
              </span>
            </div>
            <p className="text-[12px] text-white/35 leading-[1.4]">
              {t('maxDescription')}
            </p>
          </button>
        )}

        {/* ─── Email ─── */}
        <button
          onClick={() => {
            haptic.light();
            setView('email-login');
          }}
          className={cn(
            g.card,
            'p-4 w-full cursor-pointer flex items-center gap-3',
            spring,
            'active:scale-[0.985]'
          )}
        >
          <div
            className={cn(
              'w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0',
              g.thin
            )}
          >
            <Mail size={14} className="text-white/40" />
          </div>
          <span className="text-[14px] font-semibold text-white/70">
            {t('emailLogin')}
          </span>
        </button>

        {/* ─── Auto-login error ─── */}
        {autoError && (
          <div className="flex flex-col items-center gap-2 mt-1">
            <p className="text-center text-[12px] text-red-400/80">
              {t('autoLoginError')}
            </p>
            {(isTg || isMax) && (
              <button
                onClick={handleRetryAutoLogin}
                className={cn(
                  'text-[12px] text-white/50 px-4 py-2 rounded-xl',
                  g.thin,
                  spring,
                  'active:scale-[0.94]'
                )}
              >
                {t('retryLogin')}
              </button>
            )}
          </div>
        )}
      </div>

      <p className="text-center text-[11px] text-white/25 mt-8 leading-[1.6]">
        {t('terms')}
      </p>
    </PageWrapper>
  );
};

export default Login;
