'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useUser } from '@/hooks/useUser';
import { usePackages, useCreatePaymentSession } from '@/hooks/usePackages';
import type { Plan } from '@/hooks/usePackages';
import { useHaptic } from '@/hooks/useHaptic';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ChevronLeft,
  Star,
  CreditCard,
  Coins,
  Mail,
  Loader2,
  Info,
  Tag,
  Check,
  Clock,
  X,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getAppSource } from '@/lib/source';

type PayMethod = 'rub' | 'xtr' | 'usdt';

interface PromoData {
  end_time: number;
  discount: number;
}

export const Pay = () => {
  const t = useTranslations('Pay');
  const router = useRouter();
  const locale = useLocale();
  const haptic = useHaptic();
  const queryClient = useQueryClient();

  const { data: userData } = useUser();
  const { data: packagesData, isLoading, error, refetch } = usePackages();
  const createPaymentSession = useCreatePaymentSession();

  const [selectedMethod, setSelectedMethod] = useState<PayMethod>('rub');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [payingKey, setPayingKey] = useState<string | null>(null);

  // Promo state
  const [promoInput, setPromoInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState(false);

  // Countdown timer for active promo
  const [timeLeft, setTimeLeft] = useState<string>('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tokens = Number(userData?.user?.tokens ?? 0);
  const activePromo = packagesData?.promo as PromoData | null;

  // Countdown for active promo
  useEffect(() => {
    if (!activePromo?.end_time) {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeLeft('');
      return;
    }

    const tick = () => {
      const diff = activePromo.end_time * 1000 - Date.now();
      if (diff <= 0) {
        setTimeLeft('00:00:00');
        if (timerRef.current) clearInterval(timerRef.current);
        refetch();
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setTimeLeft(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      );
    };

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activePromo?.end_time]);

  // Reset mutation on mount/unmount
  useEffect(() => {
    createPaymentSession.reset();
    return () => {
      createPaymentSession.reset();
    };
  }, []);

  // Visibility / focus listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetch();
        createPaymentSession.reset();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [refetch]);

  const availableMethods = useMemo<PayMethod[]>(() => {
    if (!packagesData?.packages) return [];
    const found = new Set<PayMethod>();
    packagesData.packages.forEach((pkg) =>
      pkg.plans.forEach((plan) => {
        if (plan.amount != null) found.add('rub');
        if (plan.amount_xtr != null) found.add('xtr');
        if (plan.amount_usdt != null) found.add('usdt');
      })
    );
    const order: PayMethod[] = ['rub', 'xtr', 'usdt'];
    return order.filter((m) => found.has(m));
  }, [packagesData]);

  useEffect(() => {
    if (
      availableMethods.length > 0 &&
      !availableMethods.includes(selectedMethod)
    ) {
      setSelectedMethod(availableMethods[0]);
    }
  }, [availableMethods, selectedMethod]);

  const applyDiscount = (value: number, discount: number) =>
    Math.round(value * (1 - discount / 100));

  const getPrice = (
    plan: Plan,
    method: PayMethod
  ): { display: string; original?: string } | null => {
    const discount = activePromo?.discount ?? 0;

    if (method === 'rub' && plan.amount != null) {
      if (discount > 0) {
        return {
          display: `${applyDiscount(plan.amount, discount)} ₽`,
          original: `${plan.amount} ₽`,
        };
      }
      return { display: `${plan.amount} ₽` };
    }
    if (method === 'xtr' && plan.amount_xtr != null) {
      if (discount > 0) {
        return {
          display: `${applyDiscount(plan.amount_xtr, discount)} ⭐`,
          original: `${plan.amount_xtr} ⭐`,
        };
      }
      return { display: `${plan.amount_xtr} ⭐` };
    }
    if (method === 'usdt' && plan.amount_usdt != null) {
      if (discount > 0) {
        return {
          display: `$${(plan.amount_usdt * (1 - discount / 100)).toFixed(2)}`,
          original: `$${plan.amount_usdt}`,
        };
      }
      return { display: `$${plan.amount_usdt}` };
    }
    return null;
  };

  const getBullets = (plan: Plan): string[] => {
    if (!plan.description) return [];
    const text =
      plan.description[locale as 'ru' | 'en'] ||
      plan.description.en ||
      plan.description.ru ||
      '';
    return text.split('\n').filter((l) => l.trim().length > 0);
  };

  const formatDuration = (seconds: number): string => {
    const days = Math.round(seconds / 86400);
    if (days === 30) return t('duration30Days');
    return t('durationNdays', { days });
  };

  const handleOpenLink = (url: string) => {
    if (!url || typeof url !== 'string') {
      toast.error(t('paymentError'));
      return;
    }

    try {
      const tgWindow = window as any;
      const tgWebApp = tgWindow?.Telegram?.WebApp;

      if (tgWebApp && typeof tgWebApp.openLink === 'function') {
        tgWebApp.openLink(url);
        return;
      }

      if (
        tgWindow?.TelegramMiniApp &&
        typeof tgWindow.TelegramMiniApp.openLink === 'function'
      ) {
        tgWindow.TelegramMiniApp.openLink(url);
        return;
      }

      const openedWindow = window.open(url, '_blank', 'noopener,noreferrer');
      if (!openedWindow) {
        window.location.href = url;
      }
    } catch {
      window.location.href = url;
    }
  };

  // Apply promo code
  const handleApplyPromo = async () => {
    const code = promoInput.trim();
    if (!code || !packagesData?.promo_check_url || !packagesData?.pay_id)
      return;

    setPromoLoading(true);
    setPromoError(null);
    setPromoSuccess(false);
    haptic.medium();

    try {
      const res = await fetch(packagesData.promo_check_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pay_id: packagesData.pay_id, promo: code }),
      });

      const data = await res.json();

      if (data?.ok) {
        setPromoSuccess(true);
        haptic.success();
        toast.success(t('promoApplied'));
        await refetch();
        setPromoInput('');
      } else {
        setPromoError(t('promoInvalid'));
        haptic.error();
      }
    } catch {
      setPromoError(t('promoError'));
      haptic.error();
    } finally {
      setPromoLoading(false);
    }
  };

  const handleSelect = (pkgIdx: number, planIdx: number) => {
    haptic.medium();
    const plan = packagesData?.packages?.[pkgIdx]?.plans?.[planIdx];
    if (!packagesData || !plan) return;

    if (packagesData.email_required) {
      if (!email.trim()) {
        setEmailError(t('emailRequiredError'));
        haptic.warning();
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setEmailError(t('emailInvalidError'));
        haptic.warning();
        return;
      }
      setEmailError(null);
    }

    createPaymentSession.reset();

    const key = `${pkgIdx}-${planIdx}`;
    setPayingKey(key);
    toast.loading(t('successRedirect'));

    createPaymentSession.mutate(
      {
        webhookUrl: packagesData.webhook_url,
        payload: {
          pay_id: packagesData.pay_id,
          method: selectedMethod,
          package_index: pkgIdx,
          plan_index: planIdx,
          lang: locale,
          email: packagesData.email_required ? email.trim() : null,
        },
      },
      {
        onSuccess: (data: unknown) => {
          toast.dismiss();
          haptic.success();
          setPayingKey(null);

          let targetLink: string | null = null;

          if (data && typeof data === 'object') {
            const obj = data as Record<string, any>;

            if (
              'link' in obj &&
              typeof obj.link === 'string' &&
              obj.link.trim() !== ''
            ) {
              targetLink = obj.link;
            } else if (
              'url' in obj &&
              typeof obj.url === 'string' &&
              obj.url.trim() !== ''
            ) {
              targetLink = obj.url;
            } else if (
              'data' in obj &&
              obj.data &&
              typeof obj.data === 'object'
            ) {
              const innerData = obj.data as Record<string, any>;
              if (
                typeof innerData.link === 'string' &&
                innerData.link.trim() !== ''
              ) {
                targetLink = innerData.link;
              }
            }
          }

          if (
            targetLink &&
            typeof targetLink === 'string' &&
            !targetLink.includes('native code')
          ) {
            handleOpenLink(targetLink);
            setTimeout(() => {
              refetch();
              createPaymentSession.reset();
            }, 1000);
          } else {
            refetch();
            createPaymentSession.reset();
            toast.error(t('paymentError'));
          }
        },
        onError: (error) => {
          toast.dismiss();
          haptic.error();
          setPayingKey(null);
          createPaymentSession.reset();
          refetch();
          toast.error(t('paymentError'));
        },
      }
    );
  };

  const METHOD_LABELS: Record<PayMethod, string> = {
    rub: t('methodRub'),
    xtr: t('methodXtr'),
    usdt: t('methodUsdt'),
  };

  const METHOD_ICONS: Record<PayMethod, React.ReactNode> = {
    rub: <CreditCard size={13} />,
    xtr: <Star size={13} fill="currentColor" className="text-amber-400" />,
    usdt: <Coins size={13} />,
  };

  return (
    <div className="min-h-screen text-white font-sans">
      <header className="sticky top-0 pt-4 z-30">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => {
              haptic.light();
              router.back();
            }}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-all active:scale-90"
          >
            <ChevronLeft size={20} className="text-cyan-400" />
          </button>
          <h1 className="flex-1 text-center text-[24px] font-black tracking-tight text-cyan-400">
            {t('title')}
          </h1>
          <div className="flex items-center gap-1 px-4 py-2 rounded-full bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 text-[13px] font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(0,122,255,0.3)]">
            <span className="text-[16px]">◈</span>
            <span>{Math.trunc(tokens)}</span>
          </div>
        </div>
        {!isLoading && availableMethods.length > 0 && (
          <div className="max-w-xl mx-auto px-4 pb-3 mt-4">
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {availableMethods.map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    haptic.light();
                    setSelectedMethod(m);
                  }}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap shrink-0 transition-all duration-200',
                    selectedMethod === m
                      ? 'bg-cyan-300 text-black'
                      : 'bg-white/6 text-white/50 border border-white/8 hover:text-white/70'
                  )}
                >
                  {METHOD_ICONS[m]}
                  {METHOD_LABELS[m]}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <div className="max-w-xl mx-auto px-4 pt-2 pb-28">
        {isLoading && (
          <div className="flex items-center justify-center py-32 gap-3 text-white/30">
            <Loader2 size={24} className="animate-spin text-cyan-400" />
            <span className="text-[14px] font-bold">{t('loadingBtn')}</span>
          </div>
        )}

        {error && (
          <div className="mt-6 p-6 rounded-[28px] bg-red-500/5 border border-red-500/15 text-center">
            <Info size={24} className="mx-auto mb-2 text-red-400" />
            <p className="text-[14px] font-bold text-red-400">
              {t('errorLoadPackages')}
            </p>
          </div>
        )}

        {/* Email field */}
        <AnimatePresence>
          {packagesData?.email_required && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  placeholder={t('emailPlaceholder')}
                  className={cn(
                    'w-full pl-10 pr-4 py-4 rounded-2xl bg-zinc-900/60 border text-[14px] font-semibold text-white/90 placeholder-white/20 outline-none transition-all',
                    emailError
                      ? 'border-red-500/50 focus:border-red-500'
                      : 'border-white/[0.08] focus:border-cyan-400/50'
                  )}
                />
              </div>
              {emailError && (
                <p className="mt-1.5 ml-1 text-[12px] font-bold text-red-400">
                  {emailError}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Promo block — shown only when packages loaded */}
        <AnimatePresence>
          {packagesData && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mb-5"
            >
              {activePromo ? (
                /* Active discount banner */
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-500/8 border border-emerald-500/20">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <Tag size={14} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-black text-emerald-400">
                      {t('promoDiscountActive', {
                        discount: activePromo.discount,
                      })}
                    </p>
                    {timeLeft && (
                      <p className="text-[11px] font-bold text-white/30 flex items-center gap-1 mt-0.5">
                        <Clock size={10} />
                        {timeLeft}
                      </p>
                    )}
                  </div>
                  <span className="text-[20px] font-black text-emerald-400 shrink-0">
                    -{activePromo.discount}%
                  </span>
                </div>
              ) : (
                /* Promo code input */
                <div className="flex flex-col gap-1.5">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag
                        size={14}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
                      />
                      <input
                        type="text"
                        value={promoInput}
                        onChange={(e) => {
                          setPromoInput(e.target.value.toUpperCase());
                          if (promoError) setPromoError(null);
                          if (promoSuccess) setPromoSuccess(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleApplyPromo();
                        }}
                        placeholder={t('promoPlaceholder')}
                        maxLength={32}
                        className={cn(
                          'w-full pl-9 pr-4 py-3 rounded-2xl bg-zinc-900/50 border text-[13px] font-black tracking-widest text-white/90 placeholder-white/20 placeholder:font-normal placeholder:tracking-normal outline-none transition-all',
                          promoError
                            ? 'border-red-500/40 focus:border-red-500/60'
                            : promoSuccess
                              ? 'border-emerald-500/40'
                              : 'border-white/8 focus:border-cyan-400/40'
                        )}
                      />
                    </div>
                    <button
                      onClick={handleApplyPromo}
                      disabled={!promoInput.trim() || promoLoading}
                      className={cn(
                        'px-4 py-3 rounded-2xl text-[13px] font-black shrink-0 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none',
                        promoSuccess
                          ? 'bg-emerald-500/15 border border-emerald-500/25 text-emerald-400'
                          : 'bg-cyan-400/15 border border-cyan-400/25 text-cyan-400'
                      )}
                    >
                      {promoLoading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : promoSuccess ? (
                        <Check size={14} />
                      ) : (
                        t('promoApplyBtn')
                      )}
                    </button>
                  </div>
                  {promoError && (
                    <p className="ml-1 text-[12px] font-bold text-red-400 flex items-center gap-1">
                      <X size={10} />
                      {promoError}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Package cards */}
        {packagesData?.packages && (
          <div className="flex flex-col gap-4">
            {packagesData.packages.map((pkg, pkgIdx) =>
              pkg.plans.map((plan, planIdx) => {
                const price = getPrice(plan, selectedMethod);
                const bullets = getBullets(plan);
                const cardKey = `${pkgIdx}-${planIdx}`;
                const isPaying = payingKey === cardKey;
                const isPopular = pkg.view === 'popular';
                const isProfitable = pkg.view === 'profitable';

                return (
                  <motion.div
                    key={cardKey}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: pkgIdx * 0.06, duration: 0.35 }}
                    className={cn(
                      'relative rounded-[28px] overflow-hidden border shadow-2xl',
                      isPopular
                        ? 'bg-zinc-900/80 border-cyan-400/30 shadow-[0_0_30px_rgba(0,122,255,0.08)]'
                        : 'bg-zinc-900/50 border-white/8'
                    )}
                  >
                    {(isPopular || isProfitable) && (
                      <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5 z-10">
                        {isPopular && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-[11px] font-black text-emerald-400 leading-none">
                            {t('popular')}
                          </span>
                        )}
                        {isProfitable && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-[11px] font-black text-emerald-400 leading-none">
                            {t('profitable')}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="p-6">
                      <div className="text-[14px] font-black uppercase tracking-widest text-white/70 mb-4">
                        {pkg.icon} {pkg.text}
                      </div>
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <h2 className="text-[22px] font-black text-white leading-tight pr-16">
                          {plan.name}
                        </h2>
                        {price && (
                          <div className="text-right shrink-0">
                            <div className="text-[20px] font-black text-cyan-400 leading-tight">
                              {price.display}
                            </div>
                            {price.original && (
                              <div className="text-[13px] font-bold text-white/30 line-through leading-tight">
                                {price.original}
                              </div>
                            )}
                            <div className="text-[11px] text-white/30 font-bold mt-0.5">
                              / {formatDuration(plan.duration)}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/4 border border-white/8 mb-4">
                        <span>💎</span>
                        <span className="text-[14px] font-black text-white">
                          {plan.requests.toLocaleString()}
                        </span>
                        <span className="text-[13px] font-bold text-white/35">
                          {t('credits')}
                        </span>
                      </div>
                      {bullets.length > 0 && (
                        <ul className="flex flex-col gap-1 mb-5">
                          {bullets.map((b, i) => (
                            <li
                              key={i}
                              className="text-[14px] text-white/55 font-medium leading-snug"
                            >
                              + {b}
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex gap-2.5">
                        <button
                          onClick={() => handleSelect(pkgIdx, planIdx)}
                          disabled={isPaying || !price}
                          className="flex-1 relative overflow-hidden group flex items-center justify-center gap-2 py-3 rounded-2xl bg-cyan-300 text-cyan-950 font-black text-[14px] shadow-[0_6px_20px_rgba(0,122,255,0.4)] hover:bg-[#0066EE] transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                        >
                          <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                          {isPaying ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            t('selectBtn')
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
