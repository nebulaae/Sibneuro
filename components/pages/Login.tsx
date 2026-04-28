'use client';

import api from '@/lib/api';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { LoginButton } from '@telegram-auth/react';
import { useAuth } from '@/hooks/useAuth';
import { useBot } from '@/app/providers/BotProvider';
import { useEffect, useState, useRef } from 'react';
import { Loader2, Mail, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';
import { cn } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';

import { getAppSource } from '@/lib/source';
import { getPlatformInitData, waitForPlatformInitData } from '@/lib/platform';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [name, setName] = useState('');
  const isLoading = authLoading || botLoading;

  // Редирект если уже авторизован
  useEffect(() => {
    if (!authLoading && user) router.replace('/');
  }, [user, authLoading, router]);

  // Определяем source один раз при маунте
  useEffect(() => {
    const s = getAppSource();
    setSource(s);
  }, []);

  // Expand для Max
  useEffect(() => {
    if (source !== 'max') return;
    try {
      const maxWA = (window as any)?.WebApp;
      maxWA?.ready?.();
      maxWA?.expand?.();
    } catch { }
  }, [source]);

  // ─── Авто-логин через TMA (Telegram / Max) ───
  useEffect(() => {
    // Ждём пока source определится
    if (!source) return;
    // Только для TMA-окружений
    if (source === 'browser') return;
    // Если уже залогинен или грузится — выходим
    if (authLoading || user) return;
    // Ждём bot_id
    if (!bot?.bot_id) return;
    // Не запускаем повторно если попытка уже идёт
    if (attempted.current) return;

    attempted.current = true;
    setAutoLogging(true);

    const env = source as AppEnv;

    // Expand/ready сразу — не ждём initData
    if (source === 'tg' || source === 'telegram') {
      try {
        (window as any)?.Telegram?.WebApp?.ready?.();
        (window as any)?.Telegram?.WebApp?.expand?.();
      } catch { }
    }
    if (source === 'max') {
      try {
        const maxWA = (window as any)?.WebApp;
        maxWA?.ready?.();
        maxWA?.expand?.();
      } catch { }
    }

    // Ждём появления initData — до 5 секунд
    waitForPlatformInitData(5000).then((initData) => {
      if (!initData) {
        // За 5 секунд initData так и не появился
        attempted.current = false;
        setAutoLogging(false);
        setAutoError(true);
        console.warn('[Login] initData not available after 5s timeout');
        return;
      }

      api
        .post(
          '/api/auth/tma',
          {
            initData,
            platform: env,
            bot_id: bot.bot_id,
          },
          {
            headers: {
              'x-init-data': initData,
              'x-bot-id': bot.bot_id,
              'x-platform': env,
            },
          }
        )
        .then(({ data }) => {
          localStorage.setItem('auth_token', data.token);
          if (data.user?.id)
            localStorage.setItem('auth_user_id', String(data.user.id));
          login(data.user);
          router.replace('/');
        })
        .catch(() => {
          attempted.current = false;
          setAutoLogging(false);
          setAutoError(true);
        });
    });
  }, [source, authLoading, user, bot]);

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
      toast.success(t('authSuccess'));
      router.replace('/');
    } catch {
      haptic.error();
      toast.error(t('errorLoginTelegram'));
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error(t('errorEmailPasswordRequired'));
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
        toast.success(t('authSuccess'));
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
        toast.success(t('authSuccess'));
        router.replace('/');
      } else {
        throw new Error(data.error || t('unknownError'));
      }
    } catch (e: any) {
      haptic.error();
      const msg =
        e?.response?.status === 401
          ? t('errorInvalidCredentials')
          : e?.response?.data?.error || e?.message || t('errorLogin');
      toast.error(msg);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleEmailRegister = async () => {
    if (!email.trim() || !password.trim() || !name.trim()) {
      toast.error(t('errorFillAllFields'));
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
      if (!data.success) throw new Error(data.error || t('errorRegister'));
      haptic.success();
      toast.success(t('accountCreated'));
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
        toast(t('loginWithNewAccount'));
      }
    } catch (e: any) {
      haptic.error();
      if (e?.response?.status === 409) toast.error(t('errorEmailExists'));
      else
        toast.error(
          e?.response?.data?.error || e?.message || t('errorRegister')
        );
    } finally {
      setEmailLoading(false);
    }
  };

  // ─── Loading / auto-login spinner ───
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
          <p className="text-[13px] text-white/40">
            {autoLogging ? t('autoLoginLoading') : t('loading')}
          </p>
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

  // ─── Email login view ───
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

  // ─── Email register view ───
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

  // ─── Main view ───
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
        {/* Telegram Widget Login (только в браузере с source=tg) */}
        {source === 'tg' && (
          <div className={cn(g.card, 'p-5')}>
            <div className="flex items-center gap-2 mb-3.5">
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="white">
                  <path d="M5.5 11.5l2.8 1 1.1 3.4 1.7-2 3.4 2.5 2.5-9.4-11.5 4.5z" />
                </svg>
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

        {/* Max */}
        {source === 'max' && (
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

        {/* Email */}
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

        {autoError && (
          <p className="text-center text-[12px] text-red-400/80 mt-1">
            {t('autoLoginError')}
          </p>
        )}
      </div>

      <p className="text-center text-[11px] text-white/25 mt-8 leading-[1.6]">
        {t('terms')}
      </p>
    </PageWrapper>
  );
};

export default Login;