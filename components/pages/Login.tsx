'use client';

import api from '@/lib/api';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useBot } from '@/app/providers/BotProvider';
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Loader2,
  Mail,
  Eye,
  EyeOff,
  ArrowLeft,
} from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';
import { cn } from '@/lib/utils';
import { useLocale, useTranslations } from 'next-intl';
import { getAppSource } from '@/lib/source';
import { waitForPlatformInitData } from '@/lib/platform';
import Image from 'next/image';

type LoginView = 'main' | 'email-login' | 'email-register' | 'telegram-login';

/* ─── Seamless Vertical Marquee ─── */
const MARQUEE_IMAGES = [
  'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=400&q=80',
  'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400&q=80',
  'https://images.unsplash.com/photo-1655720828018-edd2daec9349?w=400&q=80',
  'https://images.unsplash.com/photo-1650954316166-c3361fefcc87?w=400&q=80',
  'https://images.unsplash.com/photo-1674027444485-cec3da58eef4?w=400&q=80',
];

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
            <img src={src} alt="marquee-item" className="w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/60" />
          </div>
        ))}
      </div>
    </div>
  );
};

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
  const Wrapper = href ? 'a' : 'div';

  return (
    <Wrapper
      href={href}
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
    </Wrapper>
  );
};


/* ─── Main Component ─── */
export const Login = () => {
  const router = useRouter();
  const { user, login, isLoading: authLoading } = useAuth();
  const { bot } = useBot();
  const haptic = useHaptic();
  const t = useTranslations('Login');
  const locale = useLocale();

  const [source, setSource] = useState<string | null>(null);
  const [autoLogging, setAutoLogging] = useState(false);
  const [view, setView] = useState<LoginView>('main');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [name, setName] = useState('');
  const [botInfo, setBotInfo] = useState<any>({});
  const attempted = useRef(false);

  // Yandex Captcha
  const captchaWidgetId = useRef<any>(null);
  const captchaContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setBotInfo(JSON.parse(localStorage.getItem('bot_info') || '{}'));
    } catch { }
  }, []);

  const telegramBotUsername: string | undefined = botInfo?.bot_username;

  /* Yandex SmartCaptcha */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initCaptcha = () => {
      if ((window as any).smartCaptcha && captchaContainerRef.current && captchaWidgetId.current === null) {
        captchaWidgetId.current = (window as any).smartCaptcha.render(captchaContainerRef.current, {
          sitekey: process.env.NEXT_PUBLIC_YANDEX_TOKEN,
          invisible: true,
          shieldPosition: 'bottom-right',
          callback: (token: string) => {
            (window as any)._yandexCaptchaResolve?.(token);
          },
        });
      }
    };

    if (!(window as any).smartCaptcha) {
      const script = document.createElement('script');
      script.src = 'https://captcha-api.yandex.cc/captcha.js?render=onload';
      script.defer = true;
      script.async = true;
      script.onload = initCaptcha;
      document.head.appendChild(script);
    } else {
      initCaptcha();
    }

    return () => {
      if (captchaWidgetId.current && (window as any).smartCaptcha) {
        try {
          (window as any).smartCaptcha.destroy(captchaWidgetId.current);
        } catch { }
        captchaWidgetId.current = null;
      }
    };
  }, [view]);

  const executeCaptcha = (): Promise<string> => {
    return new Promise((resolve) => {
      if (!(window as any).smartCaptcha || captchaWidgetId.current === null) {
        resolve('');
        return;
      }
      (window as any)._yandexCaptchaResolve = (token: string) => {
        (window as any).smartCaptcha.reset(captchaWidgetId.current);
        resolve(token);
      };
      try {
        (window as any).smartCaptcha.execute(captchaWidgetId.current);
      } catch {
        resolve('');
      }
    });
  };

  /* Открытие виджета авторизации Telegram */
  const openTelegramLogin = () => {
    if (!(window as any).Telegram?.Login) {
      toast.error('Telegram ещё загружается, подождите секунду');
      return;
    }

    // Новая библиотека telegram-login.js сама управляет popup/redirect_uri через origin страницы.
    // Передаём ТОЛЬКО документированные опции (client_id, request_access, lang).
    // Лишний redirect_uri ломал post_message-флоу → ошибка "redirect_uri required".
    (window as any).Telegram.Login.auth(
      {
        client_id: Number(bot?.bot_id),
        request_access: ['write', 'phone'],
        lang: locale,
      },
      async (result: any) => {
        if (!result) {
          toast.error('Авторизация отменена пользователем или произошла ошибка.');
          return;
        }
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        await handleTelegramSuccess(result);
      }
    );
  };

  /* Redirect if logged in */
  useEffect(() => {
    if (!authLoading && user) router.replace('/');
  }, [user, authLoading, router]);

  /* Detect source */
  useEffect(() => {
    const syncSource = getAppSource();
    if (syncSource) { setSource(syncSource); return; }

    const timer = setInterval(() => {
      const s = getAppSource();
      if (s) { clearInterval(timer); setSource(s); }
    }, 100);

    return () => clearInterval(timer);
  }, []);

  /* TMA Auto Login */
  const attemptTMALogin = useCallback(async () => {
    if (!source || source === 'browser' || authLoading || user || !bot?.bot_id || attempted.current) return;
    attempted.current = true;
    setAutoLogging(true);

    const initData = await waitForPlatformInitData(8000);
    if (!initData) {
      setAutoLogging(false);
      attempted.current = false;
      return;
    }

    try {
      const referrerId = localStorage.getItem('pending_referrer_id');
      const { data } = await api.post('/api/auth/tma', {
        initData,
        platform: source === 'tg' ? 'telegram' : source,
        bot_id: bot.bot_id,
        ...(referrerId ? { referrer_id: Number(referrerId) } : {}),
      });

      localStorage.setItem('auth_token', data.token);
      if (data.user?.id) localStorage.setItem('auth_user_id', String(data.user.id));
      localStorage.removeItem('pending_referrer_id');
      login(data.user);
      router.replace('/');
    } catch {
      setAutoLogging(false);
      attempted.current = false;
    }
  }, [source, authLoading, user, bot, login, router]);

  useEffect(() => { attemptTMALogin(); }, [attemptTMALogin]);

  /* Telegram Widget Success */
  const handleTelegramSuccess = async (tgData: any) => {
    try {
      const { data } = await api.post(`/api/auth/telegram?bot_id=${bot?.bot_id}`, tgData);
      localStorage.setItem('auth_token', data.token);
      login(data.user);
      haptic.success();
      router.replace('/');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || t('telegramLoginError'));
    }
  };

  /* Email Handlers */
  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) return toast.error(t('emailRequired'));
    setEmailLoading(true);
    try {
      const captchaToken = await executeCaptcha();
      const { data } = await api.post(`/api/auth/login/email?bot_id=${bot?.bot_id}`,
        { email: email.trim(), password },
        { headers: { 'x-captcha-token': captchaToken } }
      );
      localStorage.setItem('auth_token', data.token);
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

  const handleEmailRegister = async () => {
    if (!email.trim() || !password.trim() || !name.trim()) return toast.error(t('emailEmpty'));
    setEmailLoading(true);
    try {
      const captchaToken = await executeCaptcha();
      const referrerId = localStorage.getItem('pending_referrer_id');
      const query = referrerId ? `&referrer_id=${referrerId}&ref=${referrerId}` : '';
      const { data } = await api.post(`/api/auth/register/email?bot_id=${bot?.bot_id}${query}`,
        { name: name.trim(), email: email.trim(), password },
        { headers: { 'x-captcha-token': captchaToken } }
      );
      localStorage.setItem('auth_token', data.token);
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

  if (autoLogging) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-[32px] bg-zinc-900 border border-white/10 flex items-center justify-center mb-8 animate-pulse shadow-2xl">
          <Loader2 size={32} className="animate-spin text-cyan-400" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">{t('autoLoginLoading')}</h2>
        <p className="text-white/30 font-medium">{t('tagline')}</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-white overflow-hidden relative flex">
      <div className="absolute inset-0 bg-black" />
      <div ref={captchaContainerRef} className="hidden" />

      <div className="relative z-10 flex w-full h-full">
        {/* Left Side */}
        <div className="flex-1 flex items-center justify-center px-5 sm:px-8 lg:px-12 overflow-hidden">
          <div className="w-full max-w-[360px]">

            {view === 'main' ? (
              <div className="flex flex-col animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="flex flex-col items-center text-center mb-8">
                  <div className="relative mb-5">
                    <div className="absolute -inset-4 bg-cyan-400/20 blur-[40px] rounded-full mix-blend-screen" />
                    <h1 className="text-[42px] sm:text-[48px] font-black tracking-tighter leading-none mb-2 text-white">
                      Sib<span className="text-cyan-400">neuro</span>
                    </h1>
                  </div>

                  <p className="text-[15px] font-medium text-white/40 leading-relaxed max-w-[260px]">
                    {t('tagline')}
                  </p>
                </div>

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

                  <MessengerCard
                    onClick={() => setView('email-login')}
                    icon={<Mail size={22} className="text-white" />}
                    label={t('emailLogin')}
                    sublabel={t('emailLoginSubtitle')}
                    accentColor="bg-white/10"
                  />

                  <MessengerCard
                    onClick={() => setView('telegram-login')}
                    icon="/telegram.png"
                    label={t('continueWithTelegram')}
                    sublabel={t('telegramWidgetSubtitle') || 'Через официальный виджет'}
                    accentColor="bg-[#229ED9]/20"
                  />
                </div>
              </div>
            ) : view === 'telegram-login' ? (
              <div className="flex flex-col animate-in fade-in slide-in-from-right-4 duration-400">
                <button
                  onClick={() => setView('main')}
                  className="flex items-center gap-2 text-white/40 font-bold mb-10 hover:text-white transition-colors active:scale-90"
                >
                  <ArrowLeft size={18} /> {t('back')}
                </button>

                <h2 className="text-[34px] font-black tracking-tighter mb-6">
                  {t('continueWithTelegram')}
                </h2>
                <p className="text-white/50 mb-8">{t('telegramLoginDescription') || 'Нажмите кнопку ниже для входа через Telegram'}</p>
                <div className='w-full flex items-center justify-center'>
                  {bot?.bot_id ? (
                    <button onClick={openTelegramLogin} className='tg-auth-button shadow-xl shadow-blue-500/40 px-6 py-4 bg-[#229ED9] rounded-xl text-white font-bold transition-transform active:scale-95'>
                      {t('continueWithTelegram')}
                    </button>
                  ) : (
                    <div className="text-center py-10 text-white/40">{t("botIdNotConfigured")}</div>
                  )}
                </div>
              </div>
            ) : (
              /* Email Form */
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
                      className="w-full px-6 py-5 rounded-[24px] bg-zinc-900 border border-white/5 focus:border-cyan-400/40 outline-none text-[16px] font-bold transition-all"
                    />
                  )}

                  <input
                    type="email"
                    placeholder={t('emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-6 py-5 rounded-[24px] bg-zinc-900 border border-white/5 focus:border-cyan-400/40 outline-none text-[16px] font-bold transition-all"
                  />

                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder={t('passwordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-6 py-5 rounded-[24px] bg-zinc-900 border border-white/5 focus:border-cyan-400/40 outline-none text-[16px] font-bold transition-all"
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
                    className="w-full py-5 rounded-[24px] bg-cyan-400 hover:bg-[#0066CC] text-white font-black text-[17px] shadow-[0_20px_40px_rgba(0,122,255,0.3)] mt-2 active:scale-95 transition-all flex items-center justify-center disabled:opacity-60"
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
                    <span className="text-cyan-400">
                      {view === 'email-login' ? t('register') : t('signIn')}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side Marquee */}
        <div className="hidden lg:flex w-[480px] relative overflow-hidden">
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
