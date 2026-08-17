'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useDragScroll } from '@/hooks/useDragScroll';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Globe, Users, Flame, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';
import { getAppSource } from '@/lib/source';
import { openExternalLink } from '@/lib/platform';
import { cn } from '@/lib/utils';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.sibneuro.pro';

/** Доля ширины трека, которую занимает один баннер (см. класс w-[86%]). */
const SLIDE_RATIO = 0.86;
/** Пауза между автоматическими перелистываниями. */
const AUTOPLAY_MS = 5000;
/** Пауза после ручного взаимодействия, прежде чем автолистание вернётся. */
const RESUME_AFTER_MS = 9000;

/**
 * Автолистание карусели.
 *
 * Останавливается, пока пользователь трогает баннеры или вкладка скрыта, и
 * возвращается через паузу: увести оффер из-под пальца хуже, чем не показать
 * следующий. Уважает prefers-reduced-motion.
 */
function useAutoScrollCarousel(
  ref: React.RefObject<HTMLDivElement | null>,
  count: number
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || count < 2) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let timer: ReturnType<typeof setInterval> | null = null;
    let resume: ReturnType<typeof setTimeout> | null = null;

    const advance = () => {
      if (document.visibilityState !== 'visible') return;
      const slide = el.clientWidth * SLIDE_RATIO;
      const maxScroll = el.scrollWidth - el.clientWidth;
      // На последнем баннере уезжаем в начало — карусель кольцевая.
      const next = el.scrollLeft >= maxScroll - 8 ? 0 : el.scrollLeft + slide;
      el.scrollTo({ left: next, behavior: 'smooth' });
    };

    const start = () => {
      if (timer) return;
      timer = setInterval(advance, AUTOPLAY_MS);
    };

    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    // Любое касание/протяжка/колесо — пауза с отложенным возвратом.
    const pause = () => {
      stop();
      if (resume) clearTimeout(resume);
      resume = setTimeout(start, RESUME_AFTER_MS);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') start();
      else stop();
    };

    start();
    el.addEventListener('pointerdown', pause);
    el.addEventListener('wheel', pause, { passive: true });
    el.addEventListener('touchstart', pause, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      if (resume) clearTimeout(resume);
      el.removeEventListener('pointerdown', pause);
      el.removeEventListener('wheel', pause);
      el.removeEventListener('touchstart', pause);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [ref, count]);
}

type Banner = {
  id: string;
  kicker: string;
  title: string;
  cta: string;
  icon: LucideIcon;
  /** Заливка карточки — у каждого баннера своя, чтобы ряд читался как афиша */
  tint: string;
  /** Базовый цвет свечения: подсветка рамки и ореол под карточкой */
  glow: string;
  onPress: () => void;
};

/**
 * Промо-карусель в герой-блоке главной.
 *
 * Заменяет собой то, о чём раньше нельзя было узнать, не полазив по меню:
 * что есть веб-версия, что работает партнёрка и что лента — не просто грид,
 * а место для публикаций. Каждый баннер — один оффер и одно действие.
 */
export function PromoBanners() {
  const t = useTranslations('Promo');
  const tHome = useTranslations('Home');
  const router = useRouter();
  const haptic = useHaptic();
  // На ПК тача нет — колесо и перетаскивание мышью даёт хук. Тот же ref
  // используется индикатором: активный слайд считаем по scrollLeft.
  const trackRef = useDragScroll<HTMLDivElement>();
  const [active, setActive] = useState(0);

  // Внутри мини-аппа предлагаем веб-версию, в браузере — уже не нужно.
  // На сервере source неизвестен, поэтому серверный снимок всегда false:
  // баннер появляется после гидрации и не даёт расхождения разметки.
  // Источник за время жизни страницы не меняется — подписка пустая.
  const inMiniApp = useSyncExternalStore(
    () => () => {},
    () => {
      const source = getAppSource();
      return source === 'tg' || source === 'max';
    },
    () => false
  );

  const go = (href: string) => {
    haptic.light();
    router.push(href);
  };

  const banners: Banner[] = [
    ...(inMiniApp
      ? [
          {
            id: 'web',
            kicker: t('webKicker'),
            title: t('webTitle'),
            cta: t('webCta'),
            icon: Globe,
            tint: 'from-cyan-400/30 via-cyan-400/8 to-transparent',
            glow: '34,211,238',
            onPress: () => {
              haptic.light();
              openExternalLink(APP_URL);
            },
          } satisfies Banner,
        ]
      : []),
    {
      id: 'partner',
      kicker: tHome('partnershipSub'),
      title: t('partnerTitle'),
      cta: t('partnerCta'),
      icon: Users,
      tint: 'from-emerald-400/30 via-emerald-400/8 to-transparent',
      glow: '52,211,153',
      onPress: () => go('/profile/referral'),
    },
    {
      id: 'feed',
      kicker: t('feedKicker'),
      title: t('feedTitle'),
      cta: t('feedCta'),
      icon: Flame,
      tint: 'from-sky-400/30 via-sky-400/8 to-transparent',
      glow: '56,189,248',
      onPress: () => go('/trends'),
    },
    {
      id: 'topup',
      kicker: t('topUpKicker'),
      title: t('topUpTitle'),
      cta: t('topUpCta'),
      icon: Sparkles,
      tint: 'from-violet-400/30 via-violet-400/8 to-transparent',
      glow: '167,139,250',
      onPress: () => go('/pay'),
    },
  ];

  // Точки-индикаторы: считаем активный слайд по позиции скролла, а не по
  // таймеру — карусель не листается сама, чтобы не уводить оффер из-под пальца.
  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const slide = el.clientWidth * SLIDE_RATIO;
    setActive(Math.round(el.scrollLeft / Math.max(1, slide)));
  };

  useAutoScrollCarousel(trackRef, banners.length);

  return (
    <div className="min-w-0 flex flex-col gap-2.5">
      {/* Трек растянут до краёв герой-карточки (-mx-6/-mx-8 гасят её padding):
          иначе следующий баннер обрывался задолго до края и «подглядывание»
          читалось как обрезанный контент. */}
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="-mx-6 flex cursor-grab snap-x snap-mandatory gap-3 overflow-x-auto px-6 scroll-pl-6 active:cursor-grabbing sm:-mx-8 sm:px-8 sm:scroll-pl-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {banners.map(
          ({ id, kicker, title, cta, icon: Icon, tint, glow, onPress }) => (
            <button
              key={id}
              onClick={onPress}
              style={{
                // Свечение живёт ВНУТРИ карточки: цветная рамка + внутренний
                // ореол по краям. Внешней тени здесь быть не может — трек
                // скроллится по горизонтали, а значит обрезает всё, что
                // выходит за его границы, и ореол упирался в рваный край.
                borderColor: `rgba(${glow},0.42)`,
                boxShadow: `inset 0 0 42px -6px rgba(${glow},0.42), inset 0 1px 0 rgba(255,255,255,0.14)`,
              }}
              className="relative w-[86%] max-w-[420px] shrink-0 snap-start overflow-hidden rounded-[26px] border bg-white/[0.05] p-5 text-left backdrop-blur-2xl transition-all active:scale-[0.98]"
            >
              <div
                className={cn(
                  'pointer-events-none absolute inset-0 bg-gradient-to-br',
                  tint
                )}
              />
              {/* Радиальная подсветка из верхнего угла — источник «света». */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `radial-gradient(120% 90% at 88% 0%, rgba(${glow},0.4), transparent 62%)`,
                }}
              />
              {/* Крупная полупрозрачная иконка вместо картинки: держит «афишный»
                  вид без тяжёлых ассетов и не мешает читать текст. */}
              <Icon
                size={128}
                className="pointer-events-none absolute -right-6 -top-6 text-white/[0.07]"
              />

              <div className="relative flex h-full flex-col gap-1">
                <p className="text-[11px] font-black uppercase tracking-widest text-white/50">
                  {kicker}
                </p>
                <p className="text-[19px] font-black leading-tight tracking-tight text-white">
                  {title}
                </p>
                <span className="mt-3 w-fit rounded-full bg-white px-4 py-2 text-[13px] font-black text-black">
                  {cta}
                </span>
              </div>
            </button>
          )
        )}
      </div>

      <div className="flex items-center justify-center gap-1.5">
        {banners.map((b, i) => (
          <span
            key={b.id}
            className={cn(
              'h-1.5 rounded-full transition-all',
              i === active ? 'w-5 bg-cyan-200/70' : 'w-1.5 bg-white/20'
            )}
          />
        ))}
      </div>
    </div>
  );
}
