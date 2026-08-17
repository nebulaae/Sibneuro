'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowUpRight,
  Heart,
  ImageIcon,
  Loader2,
  Music,
  PenLine,
  Plus,
  RotateCw,
  Sparkles,
  Video,
  Zap,
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { useBalance } from '@/hooks/useBalance';
import { useAIModels } from '@/hooks/useModels';
import { usePaymentLink } from '@/hooks/useApiExtras';
import { useInfinitePosts, useLikePost, usePosts } from '@/hooks/usePosts';
import type { Post } from '@/hooks/usePosts';
import { buildPostGroups } from '@/lib/postGroups';
import { PromoBanners } from '@/components/home/PromoBanners';
import { TrendRail } from '@/components/home/TrendRail';
import { resolvePostMedia } from '@/lib/media';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/hooks/useHaptic';
import { SmartImage } from '@/components/shared/SmartImage';
import { SmartVideo } from '@/components/shared/SmartVideo';

type NamedPost = {
  name?: string;
  inputs?: { text?: string | null };
};

const glass = {
  thin: 'bg-white/[.06] backdrop-blur-xl border border-white/[.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]',
  card: 'bg-white/[.055] backdrop-blur-2xl border border-white/[.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_4px_20px_rgba(0,0,0,0.25)]',
  tab: 'bg-white/[.05] border border-white/[.08]',
  activeTab:
    'bg-cyan-400/15 border border-cyan-400/25 text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.18)]',
};

const categories = [
  {
    key: 'text',
    icon: PenLine,
    href: '/generate?cat=text',
    gradient: 'from-sky-400/30 via-cyan-300/15 to-transparent',
    glow: 'rgba(34,211,238,0.18)',
  },
  {
    key: 'image',
    icon: ImageIcon,
    href: '/generate?cat=image',
    gradient: 'from-emerald-400/25 via-cyan-300/12 to-transparent',
    glow: 'rgba(52,211,153,0.18)',
  },
  {
    key: 'video',
    icon: Video,
    href: '/generate?cat=video',
    gradient: 'from-violet-400/25 via-sky-400/12 to-transparent',
    glow: 'rgba(139,92,246,0.18)',
  },
  {
    key: 'music',
    icon: Music,
    href: '/generate?cat=audio',
    gradient: 'from-rose-400/22 via-pink-300/10 to-transparent',
    glow: 'rgba(251,113,133,0.18)',
  },
] as const;

const marqueeItems = [
  'marqueeText',
  'marqueeImage',
  'marqueeVideo',
  'marqueeMusic',
] as const;

type CategoryItem = (typeof categories)[number];

function SoundWaves() {
  const bars = Array.from({ length: 26 });
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-[3px] opacity-40">
      {bars.map((_, i) => (
        <span
          key={i}
          className="h-8 w-1 origin-center rounded-full bg-gradient-to-t from-rose-400 to-pink-200 animate-[soundwave_1.1s_ease-in-out_infinite]"
          style={{ animationDelay: `${(i % 9) * 0.11}s` }}
        />
      ))}
    </div>
  );
}

function CategoryBackground({
  catKey,
  photos,
  videoUrl,
  t,
}: {
  catKey: CategoryItem['key'];
  photos: string[];
  videoUrl?: string;
  t: ReturnType<typeof useTranslations>;
}) {
  if (catKey === 'video' && videoUrl) {
    return (
      <SmartVideo
        src={videoUrl}
        active
        className="absolute inset-0 h-full w-full opacity-45"
        ctx={{ surface: 'home-category' }}
      />
    );
  }

  if (catKey === 'image' && photos.length > 0) {
    // Ограничиваем число уникальных картинок (меньше декодов = меньше лага),
    // ×3 копии нужны для бесшовного marquee (-33.333%).
    const base = photos.slice(0, 5);
    const strip = [...base, ...base, ...base];
    return (
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-1.5 opacity-50">
        <div className="flex w-max gap-1.5 animate-[marquee_26s_linear_infinite]">
          {strip.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="size-14 rounded-xl object-cover"
            />
          ))}
        </div>
        <div
          className="flex w-max gap-1.5 animate-[marquee_34s_linear_infinite]"
          style={{ animationDirection: 'reverse' }}
        >
          {strip.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="size-14 rounded-xl object-cover"
            />
          ))}
        </div>
      </div>
    );
  }

  if (catKey === 'text') {
    const words = [
      t('marqueeText'),
      t('marqueeImage'),
      t('marqueeVideo'),
      t('marqueeMusic'),
    ];
    const strip = [...words, ...words, ...words];
    const rows = [
      { dur: '24s', reverse: false },
      { dur: '32s', reverse: true },
      { dur: '28s', reverse: false },
    ];
    return (
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-2 opacity-[0.16]">
        {rows.map((row, ri) => (
          <div
            key={ri}
            className="flex w-max gap-4 whitespace-nowrap"
            style={{
              animation: `marquee ${row.dur} linear infinite`,
              animationDirection: row.reverse ? 'reverse' : 'normal',
            }}
          >
            {strip.map((w, i) => (
              <span
                key={i}
                className="text-[15px] font-black uppercase tracking-tight text-white"
              >
                {w}
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (catKey === 'music') {
    return <SoundWaves />;
  }

  return null;
}

function CategoryCard({
  cat,
  photos,
  videoUrl,
  count,
  t,
  onSelect,
}: {
  cat: CategoryItem;
  photos: string[];
  videoUrl?: string;
  count: number;
  t: ReturnType<typeof useTranslations>;
  onSelect: () => void;
}) {
  const Icon = cat.icon;
  return (
    <button
      onClick={onSelect}
      className={cn(
        'group relative min-h-[160px] overflow-hidden rounded-[26px] border border-white/[0.10] bg-white/[0.06] p-4 text-left',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]',
        'transition-all duration-300 active:scale-[0.97]',
        'hover:border-white/20'
      )}
    >
      {/* Dynamic background per category */}
      <CategoryBackground
        catKey={cat.key}
        photos={photos}
        videoUrl={videoUrl}
        t={t}
      />
      {/* Color tint */}
      <div className={cn('absolute inset-0 bg-gradient-to-br', cat.gradient)} />
      {/* Readability overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      {/* Glow spot */}
      <div
        className="absolute -top-6 -left-6 h-28 w-28 rounded-full opacity-60 blur-2xl transition-opacity duration-500 group-hover:opacity-90"
        style={{ background: cat.glow }}
      />
      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div className="grid size-12 place-items-center rounded-2xl border border-white/[0.12] bg-black/30 backdrop-blur-2xl">
            <Icon className="size-5 text-white" />
          </div>
          {/* Сколько моделей внутри — видно до перехода в раздел */}
          {count > 0 && (
            <span className="rounded-full border border-white/[0.12] bg-black/40 px-2 py-0.5 text-[11px] font-black text-white/60 backdrop-blur-xl">
              {count}
            </span>
          )}
        </div>
        <div>
          <p className="text-[17px] font-black tracking-tight">
            {t(`cat.${cat.key}.title`)}
          </p>
          <p className="mt-1 text-[12px] leading-5 text-white/50">
            {t(`cat.${cat.key}.subtitle`)}
          </p>
        </div>
      </div>
    </button>
  );
}

/**
 * Баланс в шапке.
 *
 * Пока баланс неизвестен — «···», а не «0»: раньше упавший или ещё не
 * пришедший запрос выглядел как обнулённый счёт, и это была одна из самых
 * частых жалоб. Если запрос упал совсем — чип превращается в кнопку повтора.
 */
function BalanceChip() {
  const t = useTranslations('Home');
  const router = useRouter();
  const haptic = useHaptic();
  const { tokens, known, isError, isFetching, refetch } = useBalance();

  const base =
    'flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-bold backdrop-blur-2xl transition active:scale-95';

  if (isError && !known) {
    return (
      <button
        onClick={() => refetch()}
        aria-label={t('balanceUnknown')}
        className={cn(base, 'border-white/10 bg-white/[0.05] text-white/50')}
      >
        <RotateCw className={cn('size-3.5', isFetching && 'animate-spin')} />
        <span>···</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => {
        haptic.light();
        router.push('/pay');
      }}
      className={cn(
        base,
        'border-cyan-400/20 bg-cyan-400/8 text-cyan-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_8px_28px_rgba(34,211,238,0.10)]'
      )}
    >
      <span className="tabular-nums">{known ? tokens : '···'}</span>
      <span>{t('topUp')}</span>
    </button>
  );
}

function LikeButton({
  postId,
  botId,
  userId,
  liked,
  likes,
}: {
  postId: number;
  botId: number;
  userId: number;
  liked?: boolean;
  likes: number;
}) {
  const { mutate: likePost, isPending } = useLikePost();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPending) return;
    likePost({ post_id: postId, bot_id: botId, user_id: userId });
  };

  return (
    <button
      onClick={handleClick}
      className={`
        flex items-center gap-1.5 px-2.5 py-1.5 rounded-full backdrop-blur-md border transition-all duration-200 active:scale-90
        ${liked
          ? 'bg-red-500/20 border-red-500/40 text-red-400'
          : 'bg-black/40 border-white/10 text-white/50 hover:text-white/80 hover:bg-black/60'
        }
      `}
    >
      <Heart
        size={13}
        className={`transition-all duration-200 ${liked ? 'fill-red-400 text-red-400' : ''}`}
      />
      {likes > 0 && (
        <span className="text-[11px] font-bold leading-none">{likes}</span>
      )}
    </button>
  );
}

export const Home = () => {
  const t = useTranslations('Home');
  const router = useRouter();
  const haptic = useHaptic();
  const { data: userData } = useUser();
  const { data: paymentUrl } = usePaymentLink();
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfinitePosts({ limit: 12 });
  const posts = data?.pages.flatMap((page) => page.items) || [];

  // Медиа из трендов для анимированных фонов карточек-категорий.
  const trendMedia = posts.map((p) => resolvePostMedia(p));
  const photoUrls = trendMedia
    .filter((m) => m.url && !m.isVideo)
    .map((m) => m.url as string)
    .slice(0, 10);
  const videoUrl = trendMedia.find((m) => m.url && m.isVideo)?.url ?? undefined;

  const userId = userData?.user?.user_id ?? 0;
  const observer = useRef<IntersectionObserver | null>(null);

  // Отдельная выборка под полки: из 12 постов первой страницы ленты
  // осмысленных групп не собрать, а грузить ради этого всю ленту нельзя.
  //
  // skipUserId обязателен — ровно как в ленте. Без него перехватчик подставляет
  // в /api/posts текущий user_id, и авторизованному пользователю возвращаются
  // только его собственные посты: у большинства их нет, выборка приходит
  // пустой, и полки просто не отрисовываются (в браузере без входа при этом
  // всё работало — оттого баг и не был виден сразу).
  const { data: sample } = usePosts({ limit: 60, skipUserId: true });

  const groups = useMemo(() => {
    const source = (sample?.items as Post[]) || [];
    // Если выборка ещё не пришла или упала — строим полки из того, что уже
    // загружено лентой. Лучше меньше полок, чем пустая главная.
    const input = source.length ? source : posts;
    return buildPostGroups(input, {
      popular: t('groupPopular'),
      video: t('groupVideo'),
      photo: t('groupPhoto'),
    });
  }, [sample, posts, t]);

  // Число моделей в каждой категории — показываем на плитке, чтобы состав
  // раздела был понятен до перехода. Ключ категории на главной («music»)
  // не совпадает с категорией моделей на бекенде («audio»).
  const { data: allModels } = useAIModels();
  const modelCounts = useMemo(() => {
    const models = allModels || [];
    const counts: Record<string, number> = {};
    for (const cat of categories) {
      const modelCat = cat.key === 'music' ? 'audio' : cat.key;
      counts[cat.key] = models.filter(
        (m) => m.mainCategory === modelCat || m.categories?.includes(modelCat)
      ).length;
    }
    return counts;
  }, [allModels]);

  const lastPostRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        },
        { rootMargin: '360px' }
      );
      if (node) observer.current.observe(node);
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  return (
    <div className="min-h-svh overflow-x-hidden text-white pb-[calc(92px+max(16px,var(--sa-bottom)))]">
      {/* Aurora background — статичные блюр-орбы.
          Раньше анимировались (transform/scale) бесконечно: перерисовка
          гигантских размытых поверхностей каждый кадр давала жёсткий лаг на
          мобильных. Статичные орбы рисуются один раз и просто композитятся. */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full bg-cyan-500/4 blur-[120px]" />
        <div className="absolute top-20 right-0 w-[500px] h-[500px] rounded-full bg-emerald-500/6 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-sky-500/6 blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(34,211,238,0.12),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,7,11,0.2),#05070b_70%)]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 px-5 pb-3.5 pt-[calc(0.875rem+var(--sa-top))]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-3 rounded-2xl text-left transition active:scale-95"
          >
            <div>
              <p className="text-[18px] font-black tracking-tight font-mono">Sibneuro</p>
            </div>
          </button>
          <div className="flex  gap-2">
            <button
              onClick={() =>
                router.push('https://t.me/cubixvpnbot?start=HYDylP')
              }
              className="flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/8 px-4 py-2 text-[13px] font-bold text-cyan-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_8px_28px_rgba(34,211,238,0.10)] backdrop-blur-2xl transition active:scale-95"
            >
              <Zap className="size-4" />
              Vpn
            </button>

            <BalanceChip />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-5 pt-7">
        {/* Hero + Category cards */}
        {/* 75/25 вместо прежних почти равных долей: при 50/50 герой-карточке
            не хватало ширины и заголовок ломался по одному слову в строке.
            minmax(160px,…) не даёт колонке категорий схлопнуться. */}
        <section className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(160px,1fr)] lg:items-start">
          {/* Hero card.
              min-w-0 обязателен: внутри лежит промо-скроллер, а у grid-детей
              min-width по умолчанию auto — без этого широкий трек растягивает
              колонку и весь экран уезжает вправо. */}
          <div className="min-h-full min-w-0 overflow-hidden rounded-[32px] border border-white/[0.10] bg-white/[0.06] p-6 sm:p-8">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/8 px-3 py-1.5 text-[12px] font-bold text-cyan-200 backdrop-blur-xl">
              <span className="size-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
              {t('heroKicker')}
            </div>
            {/* Кегль тянется от ширины экрана: фиксированные 42px на узких
                телефонах вылезали за карточку. */}
            <h1 className="max-w-[560px] text-[clamp(30px,8.5vw,58px)] font-black leading-[0.96] tracking-tight">
              {t('heroTitle')}{' '}
              <span className="bg-gradient-to-r from-cyan-200 via-sky-300 to-emerald-300 bg-clip-text text-transparent">
                {t('heroAccent')}
              </span>
            </h1>
            <p className="mt-5 max-w-[480px] text-[15px] leading-7 text-white/50 sm:text-[16px]">
              {t('heroSubtitle')}
            </p>
            <div className="mt-8 flex flex-wrap justify-self-end gap-3">
              <button
                onClick={() => {
                  haptic.light();
                  router.push('/generate');
                }}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[14px] font-black text-black transition active:scale-95"
              >
                {t('startCreate')}
                <ArrowUpRight className="size-4" />
              </button>
              <button
                onClick={() => router.push('/trends')}
                className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.07] px-5 py-3 text-[14px] font-bold text-white/65 backdrop-blur-2xl transition active:scale-95"
              >
                {t('watchTrends')}
              </button>
            </div>

            {/* Промо-скроллер прямо в герое: веб-версия, партнёрка, лента,
                пополнение. Раньше об этих возможностях нельзя было узнать,
                не полазив по меню. */}
            <div className="mt-8">
              <PromoBanners />
            </div>
          </div>

          {/* Category 2×2 grid */}
          <div className="grid grid-cols-2 sm:grid-cols-1 gap-3">
            {categories.map((cat) => (
              <CategoryCard
                key={cat.key}
                cat={cat}
                photos={photoUrls}
                videoUrl={videoUrl}
                count={modelCounts[cat.key] ?? 0}
                t={t}
                onSelect={() => {
                  haptic.selection();
                  router.push(cat.href);
                }}
              />
            ))}
          </div>
        </section>

        {/* ── С чего начать ────────────────────────────────────────────────
            Ответ на «зашёл, а что делать»: два явных маршрута вместо одного
            общего «начать создание». «По шаблону» ведёт в тренды, где нужно
            лишь подставить своё фото — это самый короткий путь до первого
            результата, и именно его не хватало новым пользователям. */}
        <section className="flex flex-col gap-3">
          <h2 className="px-1 text-[13px] font-black uppercase tracking-widest text-white/30">
            {t('startTitle')}
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => {
                haptic.light();
                router.push('/trends');
              }}
              className="flex items-center gap-4 rounded-[26px] border border-cyan-400/25 bg-cyan-400/[0.08] p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-2xl transition active:scale-[0.98] hover:border-cyan-400/40"
            >
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-cyan-400/15 border border-cyan-400/25">
                <Sparkles className="size-5 text-cyan-200" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-black tracking-tight">
                  {t('startTemplate')}
                </p>
                <p className="truncate text-[12.5px] font-medium text-white/45">
                  {t('startTemplateHint')}
                </p>
              </div>
              <ArrowUpRight className="size-4 shrink-0 text-cyan-200" />
            </button>

            <button
              onClick={() => {
                haptic.light();
                router.push('/generate');
              }}
              className="flex items-center gap-4 rounded-[26px] border border-white/[0.10] bg-white/[0.055] p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl transition active:scale-[0.98] hover:border-white/20"
            >
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/[0.12] bg-white/[0.06]">
                <Plus className="size-5 text-white/70" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-black tracking-tight">
                  {t('startScratch')}
                </p>
                <p className="truncate text-[12.5px] font-medium text-white/45">
                  {t('startScratchHint')}
                </p>
              </div>
              <ArrowUpRight className="size-4 shrink-0 text-white/25" />
            </button>
          </div>
        </section>

        {/* Marquee */}
        <section className="-mx-5 overflow-hidden py-4">
          <div className="flex w-max animate-[marquee_30s_linear_infinite] gap-3 px-5">
            {[...marqueeItems, ...marqueeItems, ...marqueeItems].map(
              (key, index) => (
                <span
                  key={`${key}-${index}`}
                  className={cn(
                    'rounded-full border border-white/[0.08] bg-black/25 px-4 py-2 text-[13px] font-bold text-white/45',
                    glass.activeTab
                  )}
                >
                  {t(key)}
                </span>
              )
            )}
          </div>
        </section>

        {/* ── Полки по темам ───────────────────────────────────────────────
            Раньше здесь сразу шёл сплошной грид из полутора тысяч постов, в
            котором видео, фото-шаблоны и разные нейросети лежали вперемешку.
            Теперь контент разложен по полкам — видно, что вообще есть, и в
            каждую можно провалиться целиком. Общая лента осталась ниже. */}
        {groups.length > 0 && (
          <section className="flex flex-col gap-8">
            <h2 className="px-1 text-[13px] font-black uppercase tracking-widest text-white/30">
              {t('trending')}
            </h2>
            {groups.map((group) => (
              <TrendRail
                key={group.id}
                groupId={group.id}
                title={group.title}
                posts={group.posts}
                allLabel={t('all')}
                fallbackTitle={t('trend')}
              />
            ))}
          </section>
        )}

        {/* Лента — общий бесконечный грид, после всех полок */}
        <section className="pb-32">
          <div className="flex items-center justify-between mb-6 px-2">
            <h2 className="text-[24px] font-black text-cyan-400 tracking-tight">
              {t('feedTitle')}
            </h2>
            <button
              onClick={() => router.push('/trends')}
              className="text-[14px] font-medium text-white/40 hover:text-white transition-colors"
            >
              {t('all')} →
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-3/4 rounded-3xl animate-pulse bg-white/5 border border-white/10"
                />
              ))
              : posts.map((post, index) => {
                const result = post.result as any;
                const media = result?.media?.[0] || result;
                const isVideo =
                  media?.type === 'video' ||
                  (typeof media?.input === 'string' &&
                    media.input.includes('.mp4'));
                const mediaUrl = media?.url || media?.input || result?.url;
                const trendName =
                  (post as any).name || post.inputs?.text || t('trend');
                const isLast = index === posts.length - 1;

                return (
                  <div key={post.id} ref={isLast ? lastPostRef : null}>
                    <div
                      onClick={() => {
                        sessionStorage.setItem(
                          `trend_post_${post.id}`,
                          JSON.stringify(post)
                        );
                        router.push(`/trend/${post.id}`);
                      }}
                      className="group relative aspect-3/4 rounded-3xl overflow-hidden bg-zinc-900 border border-white/10 transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] hover:border-white/20 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full cursor-pointer"
                    >
                      {/* Media */}
                      {mediaUrl ? (
                        isVideo ? (
                          <SmartVideo
                            src={mediaUrl}
                            active
                            className="absolute inset-0 w-full h-full"
                            videoClassName="transition-transform duration-700 group-hover:scale-110"
                            ctx={{ surface: 'home-grid', postId: post.id }}
                          />
                        ) : (
                          <SmartImage
                            src={mediaUrl}
                            className="absolute inset-0 w-full h-full"
                            imgClassName="transition-transform duration-700 group-hover:scale-110"
                            ctx={{ surface: 'home-grid', postId: post.id }}
                          />
                        )
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/5">
                          <span className="text-[40px] animate-pulse">
                            ✨
                          </span>
                        </div>
                      )}

                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-linear-to-t from-neutral-950/90 via-neutral-950/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

                      {/* Tag + Like — top right */}
                      <div
                        className="absolute top-3 right-3 flex flex-col items-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <LikeButton
                          postId={post.id}
                          botId={post.bot_id}
                          userId={userId}
                          liked={post.liked}
                          likes={post.likes}
                        />
                      </div>

                      {/* Bottom info */}
                      <div className="absolute inset-x-0 bottom-0 p-4 transform transition-transform duration-500">
                        <div className="flex flex-col items-start justify-between gap-2">
                          <span
                            key={post.tag}
                            className="backdrop-blur-md bg-black/50 border border-white/15 px-2 py-0.5 rounded-full text-[9px] font-black text-white/95 shadow-md uppercase tracking-wider"
                          >
                            {post.tag}
                          </span>
                          <h3 className="text-base text-start font-black text-white line-clamp-2 leading-tight group-hover:text-[#007AFF] transition-colors">
                            {trendName}
                          </h3>
                        </div>
                      </div>

                      {/* Cost badge — top right */}
                      {/* <div className="absolute top-4 right-4">
                      <div className="backdrop-blur-xl border border-white/10 px-3 py-1 rounded-full text-[12px] font-bold text-white shadow-lg">
                        ◈ {post.cost || 15}
                      </div>
                    </div> */}

                    </div>
                  </div>
                );
              })}
          </div>

          {isFetchingNextPage && (
            <div className="flex justify-center py-10">
              <Loader2 className="size-7 animate-spin text-white/40" />
            </div>
          )}

          {!isLoading && posts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-40 px-10">
              <div className="w-16 h-16 rounded-3xl border-2 border-dashed border-white/20 flex items-center justify-center mb-4">
                <span className="text-2xl">⚡️</span>
              </div>
              <p className="text-[14px] font-medium">
                {t('noTrends') || 'No trends yet'}
              </p>
            </div>
          )}
        </section>
      </main>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-33.333%); }
        }
        @keyframes soundwave {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\[marquee_30s_linear_infinite\],
          [class*='animate-[marquee'] { animation: none !important; }
        }
      `}</style>
    </div>
  );
};

export default Home;
