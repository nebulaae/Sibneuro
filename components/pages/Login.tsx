'use client';

import api from '@/lib/api';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useBot } from '@/app/providers/BotProvider';
import { useEffect, useState, useRef, useCallback } from 'react';
import { LoginButton } from '@telegram-auth/react';
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
import { getAppSource } from '@/lib/source';
import { waitForPlatformInitData } from '@/lib/platform';
import Link from 'next/link';
import Image from 'next/image';

type AppEnv = 'telegram' | 'max' | 'browser';
type LoginView = 'main' | 'email-login' | 'email-register';

/* ─── Seamless Vertical Marquee ─── */
const MARQUEE_IMAGES = [
  'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=400&q=80',
  'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400&q=80',
  'https://images.unsplash.com/photo-1655720828018-edd2daec9349?w=400&q=80',
  'https://images.unsplash.com/photo-1681562353688-c7e90dd96da9?w=400&q=80',
  'https://images.unsplash.com/photo-1650954316166-c3361fefcc87?w=400&q=80',
  'https://images.unsplash.com/photo-1686191128892-3b37add4c844?w=400&q=80',
  'https://images.unsplash.com/photo-1674027444485-cec3da58eef4?w=400&q=80',
  'https://images.unsplash.com/photo-1659535872452-4a9cac1f1c4e?w=400&q=80',
];

// Split into 3 columns, each with its own subset
const col = (offset: number, count = 5) =>
  Array.from({ length: count }, (_, i) => MARQUEE_IMAGES[(offset + i) % MARQUEE_IMAGES.length]);

const MarqueeColumn = ({
  images,
  direction = 'up',
  duration = 40,
}: {
  images: string[];
  direction?: 'up' | 'down';
  duration?: number;
}) => {
  // Duplicate once — CSS animation loops, so no visible seam
  const items = [...images, ...images];

  return (
    <div className="relative h-full overflow-hidden">
      <style>{`
        @keyframes marquee-up {
          from { transform: translateY(0); }
          to   { transform: translateY(-50%); }
        }
        @keyframes marquee-down {
          from { transform: translateY(-50%); }
          to   { transform: translateY(0); }
        }
      `}</style>
      <div
        style={{
          animation: `${direction === 'up' ? 'marquee-up' : 'marquee-down'} ${duration}s linear infinite`,
        }}
        className="flex flex-col gap-4 will-change-transform"
      >
        {items.map((src, i) => (
          <div
            key={i}
            className="relative rounded-2xl overflow-hidden flex-shrink-0 border border-white/10 shadow-xl"
            style={{ aspectRatio: '4/3', minHeight: 120 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/60" />
          </div>
        ))}
      </div>
    </div>
  );
};

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
  icon: string | React.ReactNode;
  label: string;
  sublabel: string;
  accentColor: string;
  onClick?: () => void;
}) => {
  const inner = (
    <div
      className={cn(
        'p-4 w-full flex items-center gap-3.5 cursor-pointer select-none rounded-[20px] transition-all duration-200',
        'active:scale-[0.975]',
        'border border-white/5 bg-white/[0.02]',
        'hover:border-white/[0.18] hover:bg-white/[0.06]',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
      )}
      onClick={onClick}
    >
      <div className={cn('w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0', accentColor)}>
        {typeof icon === 'string' ? (
          <Image src={icon} width={24} height={24} alt={label} />
        ) : (
          icon
        )}
      </div>

      <div className="flex flex-col min-w-0 flex-1 text-left">
        <span className="text-[15px] font-bold text-white/90 leading-none mb-[5px]">{label}</span>
        <span className="text-[13px] font-medium text-white/40 leading-[1.35] truncate">{sublabel}</span>
      </div>

      <ExternalLink size={16} className="text-white/20 flex-shrink-0" />
    </div>
  );

  if (href) {
    return (
      <Link href={href} target="_blank" rel="noopener noreferrer" className="no-underline block">
        {inner}
      </Link>
    );
  }
  return inner;
};

/* ─── Main component ─── */
export const Login = () => {
  const router = useRouter();
  const { user, login, isLoading: authLoading } = useAuth();
  const { bot } = useBot();
  const haptic = useHaptic();
  const locale = useLocale();
  const t = useTranslations('Login');
  const tLegal = useTranslations('Legal');

  const [source, setSource] = useState<string | null>(null);
  const [autoLogging, setAutoLogging] = useState(false);
  const [view, setView] = useState<LoginView>('main');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [name, setName] = useState('');
  const attempted = useRef(false);

  const botInfo =
    typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('bot_info') || '{}')
      : {};
  const maxBotUsername: string | undefined = botInfo?.max_username;
  const telegramBotUsername: string | undefined = botInfo?.bot_username;

  /* redirect if already logged in */
  useEffect(() => {
    if (!authLoading && user) router.replace('/');
  }, [user, authLoading, router]);

  /* detect source */
  useEffect(() => {
    const syncSource = getAppSource();
    if (syncSource) { setSource(syncSource); return; }
    const timer = setInterval(() => {
      const s = getAppSource();
      if (s) { clearInterval(timer); setSource(s); }
    }, 100);
    return () => clearInterval(timer);
  }, []);

  /* auto-login for TMA */
  const attemptTMALogin = useCallback(async () => {
    if (!source || source === 'browser' || authLoading || user || !bot?.bot_id || attempted.current) return;
    attempted.current = true;
    setAutoLogging(true);
    const env = source === 'tg' ? 'telegram' : (source as AppEnv);
    const initData = await waitForPlatformInitData(8000);
    if (!initData) { setAutoLogging(false); attempted.current = false; return; }
    try {
      const referrerId = localStorage.getItem('pending_referrer_id');
      const { data } = await api.post('/api/auth/tma', {
        initData,
        platform: env,
        bot_id: bot.bot_id,
        ...(referrerId ? { referrer_id: Number(referrerId), ref: Number(referrerId) } : {}),
      });
      localStorage.setItem('auth_token', data.token);
      if (data.user?.id) localStorage.setItem('auth_user_id', String(data.user.id));
      localStorage.removeItem('pending_referrer_id'); // Clear on successful login
      login(data.user);
      router.replace('/');
    } catch {
      setAutoLogging(false);
      attempted.current = false;
    }
  }, [source, authLoading, user, bot, login, router]);

  useEffect(() => { attemptTMALogin(); }, [attemptTMALogin]);

  /* email login */
  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) return toast.error(t('emailRequired'));
    setEmailLoading(true);
    try {
      const { data } = await api.post(`/api/auth/login/email?bot_id=${bot?.bot_id}`, { email: email.trim(), password });
      localStorage.setItem('auth_token', data.token);
      localStorage.removeItem('pending_referrer_id'); // Clear on successful login
      login(data.user);
      haptic.success();
      router.replace('/');
    } catch (e: any) {
      haptic.error();
      toast.error(e?.response?.data?.error || t('invalidCredentials'));
    } finally {
      setEmailLoading(false);
    }
  };

  /* email register */
  const handleEmailRegister = async () => {
    if (!email.trim() || !password.trim() || !name.trim()) return toast.error(t('emailEmpty'));
    setEmailLoading(true);
    try {
      const referrerId = localStorage.getItem('pending_referrer_id');
      const queryParams = referrerId ? `&referrer_id=${referrerId}&ref=${referrerId}` : '';
      const { data } = await api.post(`/api/auth/register/email?bot_id=${bot?.bot_id}${queryParams}`, {
        name: name.trim(),
        email: email.trim(),
        password,
        ...(referrerId ? { referrer_id: Number(referrerId), ref: Number(referrerId) } : {}),
      });
      localStorage.setItem('auth_token', data.token);
      localStorage.removeItem('pending_referrer_id'); // Clear on successful register
      login(data.user);
      haptic.success();
      router.replace('/');
    } catch (e: any) {
      haptic.error();
      toast.error(e?.response?.data?.error || t('emailExists'));
    } finally {
      setEmailLoading(false);
    }
  };

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (!event.data?.id) return;

      try {
        const referrerId = localStorage.getItem('pending_referrer_id');
        const { data } = await api.post('/api/auth/telegram', {
          ...event.data,
          bot_id: bot?.bot_id,
          ...(referrerId ? { referrer_id: Number(referrerId), ref: Number(referrerId) } : {}),
        });

        localStorage.setItem('auth_token', data.token);

        if (data.user?.id) {
          localStorage.setItem(
            'auth_user_id',
            String(data.user.id)
          );
        }

        localStorage.removeItem('pending_referrer_id'); // Clear on successful login
        login(data.user);
        haptic.success();
        router.replace('/');
      } catch {
        haptic.error();
        toast.error(t('loginError'));
      }
    };

    window.addEventListener('message', handleMessage);

    return () =>
      window.removeEventListener('message', handleMessage);
  }, [bot, login, router, haptic, t]);

  /* ── Auto-login screen ── */
  if (autoLogging) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-[32px] bg-zinc-900 border border-white/10 flex items-center justify-center mb-8 animate-pulse shadow-2xl">
          <Loader2 size={32} className="animate-spin text-[#007AFF]" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">{t('autoLoginLoading')}</h2>
        <p className="text-white/30 font-medium">{t('tagline')}</p>
      </div>
    );
  }

  /* ── Main render ── */
  return (
    <div className="h-screen bg-black text-white overflow-hidden relative flex">
      {/* Background */}
      <div className="absolute inset-0 bg-black" />

      <div className="relative z-10 flex w-full h-full">
        {/* ── Left: form ── */}
        <div className="flex-1 flex items-center justify-center px-5 sm:px-8 lg:px-12 overflow-hidden">
          <div className="w-full max-w-[360px]">

            {view === 'main' ? (
              <div className="flex flex-col animate-in fade-in slide-in-from-bottom-6 duration-700">
                {/* Hero */}
                <div className="flex flex-col items-center text-center mb-8">
                  <div className="relative mb-5">
                    <div className="absolute -inset-4 bg-[#00b8db]/20 blur-[40px] rounded-full mix-blend-screen" />
                    <h1 className="text-[42px] sm:text-[48px] font-black tracking-tighter leading-none mb-2 text-white">
                      Sibneuro
                    </h1>

                  </div>
                  <p className="text-[15px] font-medium text-white/40 leading-relaxed max-w-[260px]">
                    {t('tagline')}
                  </p>
                </div>

                {/* Login options */}
                <div className="flex flex-col gap-2.5">
                  {telegramBotUsername && (
                    <MessengerCard
                      href={`https://t.me/${telegramBotUsername}?startapp=1`}
                      icon="/telegram.png"
                      label={t('openInTelegram')}
                      sublabel={t('openInTelegramSub')}
                      accentColor="bg-[#229ED9]/20"
                    />
                  )}

                  {maxBotUsername && (
                    <MessengerCard
                      href={`https://max.ru/${maxBotUsername}?startapp=1`}
                      icon="/max.png"
                      label={t('openInMax')}
                      sublabel={t('openInMaxSub')}
                      accentColor="bg-violet-500/15"
                    />
                  )}
                  <MessengerCard
                    onClick={() => { haptic.light(); setView('email-login'); }}
                    icon={<Mail size={22} className="text-white" />}
                    label={t('emailLogin')}
                    sublabel={t('emailLoginSubtitle')}
                    accentColor="bg-white/10"
                  />
                  {bot?.bot_username ? (
                    <div className="flex justify-center">
                      <button
                        onClick={() => {
                          window.open(
                            `https://oauth.telegram.org/auth?bot_id=${bot?.bot_id}&origin=${window.location.origin}&request_access=write`,
                            'telegram-auth',
                            'width=550,height=670'
                          );
                        }}
                        className={cn(
                          'group relative overflow-hidden',
                          'w-full py-5 rounded-xl',
                          'bg-[#229ED9]',
                          'hover:bg-[#1d8ec5]',
                          'transition-all duration-300',
                          'active:scale-[0.98]',
                          'shadow-[0_20px_50px_rgba(34,158,217,0.35)]',
                          'border border-white/10'
                        )}
                      >
                        {/* liquid highlight */}
                        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-70" />

                        {/* glow */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                          <div className="absolute inset-0 bg-white/10 blur-2xl" />
                        </div>

                        <div className="relative z-10 flex items-center justify-center gap-3">
                          <Image
                            src="/telegram.png"
                            width={22}
                            height={22}
                            alt="Telegram"
                            className="drop-shadow"
                          />

                          <span className="font-black text-[16px] tracking-tight text-white">
                            {t('continueWithTelegram')}
                          </span>
                        </div>
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-center py-1.5">
                      <Loader2 size={18} className="animate-spin text-white/25" />
                    </div>
                  )}
                </div>

                {/* Legal */}
                {/* <div className="mt-7 flex justify-center gap-6">
                  <Link href="/legal/offer" className="text-[13px] font-semibold text-white/30 hover:text-white transition-colors">
                    {tLegal('offer')}
                  </Link>
                  <Link href="/legal/privacy" className="text-[13px] font-semibold text-white/30 hover:text-white transition-colors">
                    {tLegal('privacy')}
                  </Link>
                </div> */}
              </div>
            ) : (
              /* ── Email form ── */
              <div className="flex flex-col animate-in fade-in slide-in-from-right-4 duration-400">
                <button
                  onClick={() => setView('main')}
                  className="flex items-center gap-2 text-white/40 font-bold mb-10 hover:text-white transition-colors active:scale-90"
                >
                  <ArrowLeft size={18} /> {t('back')}
                </button>

                <h2 className="text-[34px] font-black tracking-tighter mb-8 leading-tight">
                  {view === 'email-login' ? t('emailLoginTitle') : t('registerTitle')}
                </h2>

                <div className="flex flex-col gap-4">
                  {view === 'email-register' && (
                    <input
                      type="text"
                      placeholder={t('namePlaceholder')}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-6 py-5 rounded-[24px] bg-zinc-900 border border-white/5 focus:border-[#007AFF]/40 outline-none text-[16px] font-bold transition-all"
                    />
                  )}

                  <input
                    type="email"
                    placeholder={t('emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-6 py-5 rounded-[24px] bg-zinc-900 border border-white/5 focus:border-[#007AFF]/40 outline-none text-[16px] font-bold transition-all"
                  />

                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder={t('passwordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-6 py-5 rounded-[24px] bg-zinc-900 border border-white/5 focus:border-[#007AFF]/40 outline-none text-[16px] font-bold transition-all"
                    />
                    <button
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 transition-colors"
                    >
                      {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>

                  <button
                    onClick={view === 'email-login' ? handleEmailLogin : handleEmailRegister}
                    disabled={emailLoading}
                    className="w-full py-5 rounded-[24px] bg-[#007AFF] hover:bg-[#0066CC] text-white font-black text-[17px] shadow-[0_20px_40px_rgba(0,122,255,0.3)] mt-2 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-60"
                  >
                    {emailLoading ? (
                      <Loader2 className="animate-spin" size={22} />
                    ) : view === 'email-login' ? (
                      t('signIn')
                    ) : (
                      t('createAccount')
                    )}
                  </button>

                  <button
                    onClick={() => setView(view === 'email-login' ? 'email-register' : 'email-login')}
                    className="mt-2 text-center text-white/30 font-bold text-[14px] hover:text-white transition-colors"
                  >
                    {view === 'email-login' ? t('noAccount') : t('alreadyHaveAccount')}{' '}
                    <span className="text-[#007AFF]">
                      {view === 'email-login' ? t('register') : t('signIn')}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: seamless marquee gallery ── */}
        <div className="hidden lg:flex w-[480px] relative overflow-hidden">
          {/* fade top/bottom only */}
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black to-transparent z-10 pointer-events-none" />
          <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black to-transparent z-10 pointer-events-none" />

          <div className="grid grid-cols-2 gap-3 p-4 w-full h-full">
            <MarqueeColumn images={col(0, 6)} direction="up" duration={40} />
            <MarqueeColumn images={col(4, 6)} direction="down" duration={46} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;