'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowUpRight,
  Heart,
  ImageIcon,
  Loader2,
  Music,
  PenLine,
  Play,
  Sparkles,
  Video,
  Zap,
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { usePaymentLink } from '@/hooks/useApiExtras';
import { useInfinitePosts, useLikePost } from '@/hooks/usePosts';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/hooks/useHaptic';

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
        ${
          liked
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
  const userId = userData?.user?.user_id ?? 0;
  const tokens = Math.trunc(userData?.user?.tokens ?? 0);
  const observer = useRef<IntersectionObserver | null>(null);

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
    <div className="min-h-svh overflow-x-hidden text-white pb-[calc(92px+max(16px,env(safe-area-inset-bottom)))]">
      {/* Aurora background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full bg-cyan-500/4 blur-[120px] animate-[aurora1_18s_ease-in-out_infinite]" />
        <div className="absolute top-20 right-0 w-[500px] h-[500px] rounded-full bg-emerald-500/6 blur-[120px] animate-[aurora2_22s_ease-in-out_infinite]" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-sky-500/6 blur-[100px] animate-[aurora3_28s_ease-in-out_infinite]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(34,211,238,0.12),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,7,11,0.2),#05070b_70%)]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 px-5 py-3.5">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-3 rounded-2xl text-left transition active:scale-95"
          >
            <div>
              <p className="text-[18px] font-black tracking-tight">Sibneuro</p>
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

            <button
              onClick={() => {
                router.push('/pay');
              }}
              className="flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/8 px-4 py-2 text-[13px] font-bold text-cyan-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_8px_28px_rgba(34,211,238,0.10)] backdrop-blur-2xl transition active:scale-95"
            >
              <span>{tokens}</span>
              <span className="">{t('topUp')}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-5 pt-7">
        {/* Hero + Category cards */}
        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          {/* Hero card */}
          <div className="min-h-full rounded-[32px] border border-white/[0.10] bg-white/[0.055] p-6  backdrop-blur-3xl sm:p-8">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/8 px-3 py-1.5 text-[12px] font-bold text-cyan-200 backdrop-blur-xl">
              <span className="size-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
              {t('heroKicker')}
            </div>
            <h1 className="max-w-[560px] text-[42px] font-black leading-[0.96] tracking-tight sm:text-[58px]">
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
          </div>

          {/* Category 2×2 grid */}
          <div className="grid grid-cols-2 sm:grid-cols-1 gap-3">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.key}
                  onClick={() => {
                    haptic.selection();
                    router.push(cat.href);
                  }}
                  className={cn(
                    'group relative min-h-[160px] overflow-hidden rounded-[26px] border border-white/[0.10] bg-white/[0.055] p-4 text-left',
                    'shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-3xl',
                    'transition-all duration-300 active:scale-[0.97]',
                    'hover:border-white/20'
                  )}
                >
                  {/* Gradient fill */}
                  <div
                    className={cn(
                      'absolute inset-0 bg-gradient-to-br opacity-100',
                      cat.gradient
                    )}
                  />
                  {/* Glow spot */}
                  <div
                    className="absolute -top-6 -left-6 w-28 h-28 rounded-full blur-2xl opacity-60 transition-opacity duration-500 group-hover:opacity-90"
                    style={{ background: cat.glow }}
                  />
                  <div className="relative z-10 flex h-full flex-col justify-between">
                    <div className="grid size-12 place-items-center rounded-2xl border border-white/[0.12] bg-black/25 backdrop-blur-2xl">
                      <Icon className="size-5 text-white" />
                    </div>
                    <div>
                      <p className="text-[17px] font-black tracking-tight">
                        {t(`cat.${cat.key}.title`)}
                      </p>
                      <p className="mt-1 text-[12px] leading-5 text-white/40">
                        {t(`cat.${cat.key}.subtitle`)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Marquee */}
        <section className="-mx-5 overflow-hidden  py-4 backdrop-blur-xl">
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

        {/* Trends section */}
        <section className="pb-32">
          <div className="flex items-center justify-between mb-6 px-2">
            <h2 className="text-[24px] font-black text-cyan-400 tracking-tight">
              {t('trending')}
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
                            <video
                              src={mediaUrl}
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                              muted
                              loop
                              playsInline
                              onMouseEnter={(e) => e.currentTarget.play()}
                              onMouseLeave={(e) => e.currentTarget.pause()}
                            />
                          ) : (
                            <img
                              src={mediaUrl}
                              alt=""
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
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

                        {/* Bottom info */}
                        <div className="absolute inset-x-0 bottom-0 p-4 transform transition-transform duration-500">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-base text-start font-black text-white line-clamp-2 leading-tight group-hover:text-cyan-400 transition-colors">
                              {trendName}
                            </h3>

                            {/* Like button — bottom left */}
                            <div onClick={(e) => e.stopPropagation()}>
                              <LikeButton
                                postId={post.id}
                                botId={post.bot_id}
                                userId={userId}
                                liked={post.liked}
                                likes={post.likes}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Cost badge — top right */}
                        {/* <div className="absolute top-4 right-4">
                      <div className="backdrop-blur-xl border border-white/10 px-3 py-1 rounded-full text-[12px] font-bold text-white shadow-lg">
                        ◈ {post.cost || 15}
                      </div>
                    </div> */}

                        {/* Video play icon — top left */}
                        {isVideo && (
                          <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
                              <Play className="size-4 fill-white text-white" />
                            </div>
                          </div>
                        )}
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
        @keyframes aurora1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(60px, -40px) scale(1.1); }
          66% { transform: translate(-30px, 30px) scale(0.95); }
        }
        @keyframes aurora2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          40% { transform: translate(-50px, 60px) scale(1.08); }
          70% { transform: translate(40px, -30px) scale(0.92); }
        }
        @keyframes aurora3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          30% { transform: translate(30px, -50px) scale(1.06); }
          65% { transform: translate(-40px, 20px) scale(0.96); }
        }
      `}</style>
    </div>
  );
};

export default Home;
