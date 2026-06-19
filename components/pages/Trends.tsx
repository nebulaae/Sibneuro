'use client';

import { useRef, useEffect, useCallback, useState, memo } from 'react';

import { useTranslations } from 'next-intl';
import { useInfinitePosts, useLikePost, Post } from '@/hooks/usePosts';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  AlertCircle,
  Loader2,
  Play,
  Lock,
  Camera,
  CheckCircle2,
  ChevronLeft,
  Zap,
  Share2,
  Copy,
  Send,
  Globe,
  Heart,
  FolderPlus,
  Link2,
  LayoutGrid,
  Rows3,
  Repeat2,
  X,
} from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';
import { cn, sanitizeMediaUrl } from '@/lib/utils';
import { SmartImage } from '@/components/shared/SmartImage';
import { convertMediaToInputs, useGenerateAI } from '@/hooks/useGenerations';
import { toast } from 'sonner';
import { useUpload } from '@/hooks/useApiExtras';
import { useUser } from '@/hooks/useUser';
import { useAIModels } from '@/hooks/useModels';
import { useBot } from '@/app/providers/BotProvider';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { AddToAlbumDialog } from '@/components/dialogs/AddToAlbumsDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '../ui/input';
import { isVideoMedia } from '@/lib/media';

export const Trends = () => {
  const t = useTranslations('Trends');
  const haptic = useHaptic();

  // Лента (полноэкранная) — основной вид; грид доступен по переключателю.
  const [view, setView] = useState<'feed' | 'grid'>('feed');

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfinitePosts({ limit: 12 });

  const posts = data?.pages.flatMap((page) => page.items) || [];

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
        { rootMargin: '600px' }
      );
      if (node) observer.current.observe(node);
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  // ── Сохранение/восстановление позиции ленты между перезагрузками ──
  const scrollRef = useRef<HTMLDivElement>(null);
  const restoredRef = useRef(false);
  const targetIndexRef = useRef(0);

  useEffect(() => {
    const saved = parseInt(
      sessionStorage.getItem('trends_feed_index') || '0',
      10
    );
    targetIndexRef.current = Number.isNaN(saved) ? 0 : saved;
  }, []);

  // После загрузки данных прокручиваем к сохранённому рилсу; если он глубже
  // загруженных — подгружаем следующие страницы, пока не дотянемся.
  useEffect(() => {
    if (restoredRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const target = targetIndexRef.current;
    if (target <= 0) {
      restoredRef.current = true;
      return;
    }
    if (posts.length > target) {
      el.scrollTo({ top: target * el.clientHeight, behavior: 'auto' });
      restoredRef.current = true;
    } else if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [posts.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !restoredRef.current) return;
    const idx = Math.round(el.scrollTop / Math.max(1, el.clientHeight));
    try {
      sessionStorage.setItem('trends_feed_index', String(idx));
    } catch {}
  }, []);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center">
        <div className="w-20 h-20 rounded-[32px] bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
          <AlertCircle className="size-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">{t('error')}</h2>
        <p className="text-white/40 font-medium max-w-[240px]">
          {t('errorDesc')}
        </p>
      </div>
    );
  }

  // ── GRID VIEW (альтернативный) ──
  if (view === 'grid') {
    return (
      <div className="flex flex-col min-h-screen pb-32 max-w-2xl mx-auto w-full">
        <div className="px-6 pt-12">
          <div className="flex items-start justify-between mb-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-[34px] font-black tracking-tight text-[#22d3ee] leading-none">
                  {t('title')}
                </h1>
                <div className="w-8 h-8 rounded-xl bg-[#22d3ee]/20 flex items-center justify-center">
                  <Sparkles size={18} className="text-[#22d3ee]" />
                </div>
              </div>
              <p className="text-white/40 text-[16px] font-medium leading-relaxed max-w-[320px]">
                {t('subtitle')}
              </p>
            </div>
            <button
              onClick={() => {
                haptic.selection();
                setView('feed');
              }}
              className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 active:scale-90 transition-all shrink-0"
              aria-label="Лента"
            >
              <Rows3 size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-3/4 rounded-3xl bg-zinc-900 border border-white/5 animate-pulse"
                  />
                ))
              : posts.map((post, index) => {
                  const isLast = index === posts.length - 1;
                  return (
                    <div key={post.id} ref={isLast ? lastPostRef : null}>
                      <TrendCard post={post} />
                    </div>
                  );
                })}
          </div>

          {isFetchingNextPage && (
            <div className="flex justify-center py-10">
              <Loader2 className="size-7 animate-spin text-white/40" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── FEED VIEW (основной, полноэкранный) ──
  return (
    <div className="fixed inset-0 z-30 bg-black">
      {/* Top controls */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 pt-[calc(12px+env(safe-area-inset-top))] pb-6 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/30 backdrop-blur-xl border border-white/10 pointer-events-auto">
          <Sparkles size={14} className="text-[#22d3ee]" />
          <span className="text-[13px] font-black text-white">{t('title')}</span>
        </div>
        <button
          onClick={() => {
            haptic.selection();
            setView('grid');
          }}
          className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all pointer-events-auto"
          aria-label="Сетка"
        >
          <LayoutGrid size={18} />
        </button>
      </div>

      {isLoading ? (
        <div className="h-full w-full flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-white/40" />
        </div>
      ) : (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full w-full max-w-[560px] mx-auto overflow-y-scroll snap-y snap-mandatory overscroll-contain [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none' }}
        >
          {posts.map((post, index) => {
            const isLast = index === posts.length - 1;
            return (
              <div
                key={post.id}
                ref={isLast ? lastPostRef : null}
                className="h-full w-full snap-start snap-always"
              >
                <FeedItem post={post} />
              </div>
            );
          })}

          {isFetchingNextPage && (
            <div className="h-24 flex items-center justify-center">
              <Loader2 className="size-7 animate-spin text-white/40" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── FeedItem — полноэкранный элемент ленты (Reels/Pinterest-style) ───────────

const FeedItem = memo(({ post }: { post: Post }) => {
  const t = useTranslations('Trends');
  const router = useRouter();
  const haptic = useHaptic();
  const { data: userData } = useUser();
  const { data: allModels } = useAIModels();
  const { bot } = useBot();
  const { user: authUser } = useAuth();
  const likePost = useLikePost();
  const generate = useGenerateAI();

  const userId = userData?.user?.user_id ?? (userData?.user as any)?.id ?? 0;
  const botId = (bot as any)?.bot_id ?? 0;

  const [burst, setBurst] = useState(false);
  const lastTap = useRef(0);

  // Модалка «Повторить» — подстановка фото перед генерацией
  const upload = useUpload();
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [urlDraft, setUrlDraft] = useState('');
  const repeatFileRef = useRef<HTMLInputElement>(null);
  const mediaSlots = post.inputs?.media || [];
  const chosenPhoto = photoUrl || sanitizeMediaUrl(urlDraft);

  const result = post.result as any;
  const media = result?.media?.[0] || result;
  const rawMediaUrl = media?.url || media?.input || result?.url;
  const mediaUrl = sanitizeMediaUrl(rawMediaUrl);
  const isVideo = isVideoMedia(mediaUrl, media?.type);

  const trendName = (post as any).name || post.inputs?.text || t('trend');
  const model = allModels?.find((m: any) => m.tech_name === post.model_tech_name);
  const isLiked = (post as any).liked ?? false;
  const likesCount = post.likes ?? 0;

  // bot_id/user_id подставит интерсептор (lib/api.ts), даже если тут 0 —
  // поэтому не блокируем лайк и не показываем ложную ошибку. Оптимистичный
  // апдейт в useLikePost обновляет счётчик мгновенно.
  const toggleLike = useCallback(() => {
    if (!authUser) {
      router.push('/login');
      return;
    }
    haptic.light();
    likePost.mutate({ post_id: post.id, bot_id: botId, user_id: userId });
  }, [authUser, router, botId, userId, post.id, likePost, haptic]);

  // Двойной тап по картинке — лайк (TikTok-style), только «вперёд»
  const handleMediaTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      lastTap.current = 0;
      setBurst(true);
      setTimeout(() => setBurst(false), 700);
      if (!isLiked && authUser) {
        haptic.light();
        likePost.mutate({ post_id: post.id, bot_id: botId, user_id: userId });
      }
    } else {
      lastTap.current = now;
    }
  }, [isLiked, authUser, userId, botId, post.id, likePost, haptic]);

  const handleShare = useCallback(() => {
    haptic.light();
    const botUsername = bot?.bot_username || 'bot';
    const appLink = `https://t.me/${botUsername}?startapp=post-${post.id}${userId ? `_ref-${userId}` : ''}`;
    const webLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/trend/${post.id}${userId ? `?ref=${userId}` : ''}`;
    const tg = (window as any)?.Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(appLink)}&text=${encodeURIComponent(trendName)}`
      );
      return;
    }
    if (typeof navigator.share === 'function') {
      navigator.share({ title: trendName, url: webLink }).catch(() => {});
      return;
    }
    navigator.clipboard?.writeText(webLink).then(() => {
      haptic.success();
      toast.success(t('linkCopied') || 'Ссылка скопирована');
    });
  }, [bot, post.id, userId, trendName, haptic, t]);

  // Запуск генерации по данным тренда. overrideUrl — фото от пользователя
  // (подставляется в первый медиа-слот). Ведём сразу в чат с результатом.
  const runGenerate = useCallback(
    (overrideUrl?: string) => {
      if (generate.isPending) return;
      haptic.medium();

      const finalMedia = mediaSlots.map((slot, i) => ({
        type: slot.type === 'media' ? 'image' : slot.type || 'image',
        format: 'url',
        input:
          i === 0 && overrideUrl
            ? overrideUrl
            : ((slot.input as any)?.input ?? slot.input),
      }));
      if (!mediaSlots.length && overrideUrl) {
        finalMedia.push({ type: 'image', format: 'url', input: overrideUrl });
      }

      const inputs = convertMediaToInputs(
        post.inputs?.text || ' ',
        finalMedia as any
      );

      generate.mutate(
        {
          tech_name: post.model_tech_name,
          version: post.version_label,
          inputs,
          params: post.params,
          post_id: post.id,
        },
        {
          onSuccess: (data) => {
            setRepeatOpen(false);
            if (data.dialogue_id) {
              haptic.success();
              router.push(`/chats/${data.dialogue_id}`);
            }
          },
        }
      );
    },
    [generate, mediaSlots, post, haptic, router]
  );

  // Клик по «Повторить»: есть входные фото — спрашиваем фото; нет — генерим сразу.
  const handleCreate = useCallback(() => {
    if (generate.isPending) return;
    if (!authUser) {
      router.push('/login');
      return;
    }
    if (mediaSlots.length > 0) {
      setPhotoUrl('');
      setUrlDraft('');
      setRepeatOpen(true);
    } else {
      runGenerate();
    }
  }, [generate.isPending, authUser, router, mediaSlots.length, runGenerate]);

  const handleRepeatFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const up = await upload.mutateAsync(file);
      setPhotoUrl(up.url);
      setUrlDraft('');
    } catch {
      toast.error(t('uploadErrorLink') || 'Ошибка загрузки фото');
    }
    if (repeatFileRef.current) repeatFileRef.current.value = '';
  };

  return (
    <section className="relative h-full w-full overflow-hidden bg-zinc-950">
      {/* Media */}
      <div
        className="absolute inset-0"
        onClick={handleMediaTap}
        onDoubleClick={(e) => e.preventDefault()}
      >
        {mediaUrl ? (
          isVideo ? (
            <video
              src={mediaUrl}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            <SmartImage
              src={mediaUrl}
              loading="eager"
              className="absolute inset-0 w-full h-full"
              ctx={{ surface: 'feed', postId: post.id }}
            />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[40px] animate-pulse">✨</span>
          </div>
        )}
      </div>

      {/* Gradients for legibility */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

      {/* Double-tap like burst */}
      <AnimatePresence>
        {burst && (
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1.15, opacity: 1 }}
            exit={{ scale: 1.4, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <Heart size={120} className="fill-white/90 text-white/90 drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right action rail */}
      <div className="absolute right-3 bottom-[calc(120px+env(safe-area-inset-bottom))] z-20 flex flex-col items-center gap-5">
        {/* Like */}
        <button
          onClick={toggleLike}
          className="flex flex-col items-center gap-1.5 active:scale-90 transition-all"
        >
          <span
            className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center border backdrop-blur-xl shadow-lg transition-colors',
              isLiked
                ? 'bg-red-500/90 border-red-400/40'
                : 'bg-black/40 border-white/15'
            )}
          >
            <Heart
              size={24}
              className={cn(
                'transition-all',
                isLiked ? 'fill-white text-white' : 'text-white'
              )}
            />
          </span>
          <span className="text-[12px] font-black text-white tabular-nums drop-shadow">
            {likesCount >= 1000
              ? `${(likesCount / 1000).toFixed(1)}k`
              : likesCount}
          </span>
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          className="flex flex-col items-center gap-1.5 active:scale-90 transition-all"
        >
          <span className="w-12 h-12 rounded-full flex items-center justify-center bg-black/40 border border-white/15 backdrop-blur-xl shadow-lg">
            <Send size={22} className="text-white -ml-0.5" />
          </span>
          <span className="text-[11px] font-bold text-white/80 drop-shadow">
            {t('share') || 'Поделиться'}
          </span>
        </button>

        {/* Create / Повторить */}
        <button
          onClick={handleCreate}
          disabled={generate.isPending}
          className="flex flex-col items-center gap-1.5 active:scale-90 transition-all disabled:opacity-80"
        >
          <span className="w-12 h-12 rounded-full flex items-center justify-center bg-[#22d3ee] border border-[#22d3ee] shadow-[0_0_24px_rgba(34,211,238,0.5)]">
            {generate.isPending ? (
              <Loader2 size={22} className="text-white animate-spin" />
            ) : (
              <Repeat2 size={24} className="text-white" />
            )}
          </span>
          <span className="text-[11px] font-black text-white drop-shadow">
            {t('repeat') || 'Повторить'}
          </span>
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute left-4 right-20 bottom-[calc(96px+env(safe-area-inset-bottom))] z-10 flex flex-col gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 shrink-0">
            <Avatar className="size-full">
              <AvatarImage src={model?.avatar} />
              <AvatarFallback>
                {(post.model_name || 'A')[0]}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-black text-white leading-tight truncate drop-shadow">
              {post.model_name || post.model_tech_name?.replace(/^.*\//, '')}
            </p>
            {post.version_label && (
              <p className="text-[11px] font-bold text-white/60 leading-tight truncate drop-shadow">
                {post.version_label}
              </p>
            )}
          </div>
        </div>
        {!post.inputs?.hide_text && (
          <p className="text-[14px] font-medium text-white/90 leading-snug line-clamp-2 drop-shadow">
            {trendName}
          </p>
        )}
      </div>

      {/* «Повторить» — модалка подстановки фото */}
      <Dialog open={repeatOpen} onOpenChange={setRepeatOpen}>
        <DialogContent className="bg-zinc-950/95 border-white/10 text-white max-w-md p-6 rounded-[32px] backdrop-blur-2xl shadow-2xl">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-[20px] font-black tracking-tight text-white">
              {t('repeat') || 'Повторить'}
            </DialogTitle>
            <DialogDescription className="text-white/40 text-[13px] font-medium">
              Добавьте своё фото или продолжите без него
            </DialogDescription>
          </DialogHeader>

          {/* Превью / зона загрузки */}
          {chosenPhoto ? (
            <div className="relative aspect-square w-full rounded-[24px] overflow-hidden border border-[#22d3ee]/40 mb-3">
              <SmartImage src={chosenPhoto} className="absolute inset-0 w-full h-full" />
              <button
                onClick={() => {
                  setPhotoUrl('');
                  setUrlDraft('');
                }}
                className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/60 border border-white/15 flex items-center justify-center text-white active:scale-90 transition-all"
              >
                <X size={15} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => repeatFileRef.current?.click()}
              disabled={upload.isPending}
              className="w-full aspect-[2/1] rounded-[24px] bg-zinc-900/60 border-2 border-dashed border-white/15 flex flex-col items-center justify-center gap-2 text-white/40 hover:border-[#22d3ee]/40 hover:text-[#22d3ee] active:scale-[0.98] transition-all mb-3"
            >
              {upload.isPending ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <Camera size={26} />
              )}
              <span className="text-[13px] font-bold">
                {upload.isPending ? 'Загрузка…' : 'Загрузить фото'}
              </span>
            </button>
          )}

          {/* Ссылка на фото */}
          <div className="relative mb-4">
            <Link2
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 z-10"
            />
            <Input
              type="url"
              inputMode="url"
              value={urlDraft}
              onChange={(e) => {
                setUrlDraft(e.target.value);
                if (photoUrl) setPhotoUrl('');
              }}
              placeholder="…или вставьте ссылку на фото"
              className="w-full h-12 pl-11 pr-4 rounded-2xl bg-zinc-900/60 border border-white/10 text-[14px] text-white placeholder:text-white/25 outline-none focus:border-[#22d3ee]/50 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => runGenerate(chosenPhoto || undefined)}
              disabled={!chosenPhoto || generate.isPending}
              className={cn(
                'w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-black text-[16px] transition-all active:scale-[0.98]',
                chosenPhoto && !generate.isPending
                  ? 'bg-[#22d3ee] text-white shadow-[0_0_24px_rgba(34,211,238,0.4)]'
                  : 'bg-white/5 text-white/25'
              )}
            >
              {generate.isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Zap size={18} fill="currentColor" />
              )}
              Продолжить с фото
            </button>
            <button
              onClick={() => runGenerate(undefined)}
              disabled={generate.isPending}
              className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-bold text-[14px] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              Продолжить без фото
            </button>
          </div>

          <input
            ref={repeatFileRef}
            type="file"
            accept="image/*,.heic"
            onChange={handleRepeatFile}
            className="hidden"
          />
        </DialogContent>
      </Dialog>
    </section>
  );
});

FeedItem.displayName = 'FeedItem';

// ─── TrendCard — Pinterest-style likes bottom-right ───────────────────────────

export const TrendCard = memo(({ post }: { post: Post }) => {
  const t = useTranslations('Trends');
  const router = useRouter();
  const haptic = useHaptic();
  const { data: userData } = useUser();
  const likePost = useLikePost();
  const { bot } = useBot();

  const [albumDialogOpen, setAlbumDialogOpen] = useState(false);

  const userId = userData?.user?.user_id ?? (userData?.user as any)?.id ?? 0;
  const botId = (bot as any)?.bot_id ?? 0;

  const onClick = useCallback(() => {
    haptic.light();
    try {
      sessionStorage.setItem(`trend_post_${post.id}`, JSON.stringify(post));
    } catch {}
    router.push(`/trend/${post.id}`);
  }, [post.id, post, router, haptic]);

  const handleLike = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      haptic.light();
      likePost.mutate({ post_id: post.id, bot_id: botId, user_id: userId });
    },
    [post.id, botId, userId, haptic, likePost]
  );

  const handleAddToAlbum = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      haptic.light();
      setAlbumDialogOpen(true);
    },
    [haptic]
  );

  const result = post.result as any;
  const media = result?.media?.[0] || result;
  const rawMediaUrl = media?.url || media?.input || result?.url;
  const mediaUrl = sanitizeMediaUrl(rawMediaUrl);
  const isVideo = isVideoMedia(mediaUrl, media?.type);
  const trendName = (post as any).name || post.inputs?.text || t('trend');

  const isLiked = (post as any).liked ?? false;
  const likesCount = post.likes ?? 0;

  return (
    <>
      <motion.div
        className="group relative aspect-3/4 rounded-3xl overflow-hidden cursor-pointer border border-white/10 bg-zinc-900 transition-all duration-500 hover:border-white/20 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        onClick={onClick}
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
            <SmartImage
              src={mediaUrl}
              className="absolute inset-0 w-full h-full"
              imgClassName="transition-transform duration-700 group-hover:scale-110"
              ctx={{ surface: 'grid', postId: post.id }}
            />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-white/5">
            <span className="text-[32px] animate-pulse">✨</span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

        {/* Cost & Moderation badges — top left */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg w-fit">
            <span className="text-[11px] font-black text-white">
              {post.cost ?? 15}
            </span>
            <span className="text-[10px] text-[#22d3ee]">◈</span>
          </div>

          {post.published === 0 && (
            <div className="bg-amber-500/80 backdrop-blur-xl border border-amber-400/30 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-lg w-fit">
              <span className="text-[9px] font-black text-white uppercase tracking-wider">
                {t('underModeration') || 'На модерации'}
              </span>
            </div>
          )}
        </div>

        {/* Video play icon */}
        {isVideo && (
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
              <Play className="size-4 fill-white text-white" />
            </div>
          </div>
        )}

        {/* ── Add to Album — top right, on hover ── */}
        <motion.button
          whileTap={{ scale: 0.82 }}
          onClick={handleAddToAlbum}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center shadow-lg hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
        >
          <FolderPlus size={14} className="text-white/80" />
        </motion.button>

        {/* Bottom info */}
        <div className="absolute inset-x-0 bottom-0 p-3 text-start">
          <h3 className="text-white text-[14px] font-bold line-clamp-1 leading-tight group-hover:text-[#22d3ee] transition-colors pr-12">
            {trendName}
          </h3>
          {post.model_name && (
            <p className="text-[10px] text-white/40 font-medium mt-0.5">
              by {post.model_name}
            </p>
          )}
        </div>

        {/* ── Pinterest-style Like — BOTTOM RIGHT, always visible ── */}
        <motion.button
          whileTap={{ scale: 0.75 }}
          onClick={handleLike}
          className={cn(
            'absolute bottom-2.5 right-2.5 flex items-center gap-1 h-7 rounded-full backdrop-blur-md border shadow-lg transition-all duration-200',
            likesCount > 0 ? 'pl-2 pr-2.5' : 'w-7 justify-center px-0',
            isLiked
              ? 'bg-red-500/85 border-red-400/40 shadow-[0_4px_12px_rgba(239,68,68,0.4)]'
              : 'bg-black/50 border-white/15 hover:bg-black/70 hover:border-white/25'
          )}
        >
          <Heart
            size={13}
            className={cn(
              'transition-all duration-200 shrink-0',
              isLiked
                ? 'fill-white text-white scale-110'
                : 'text-white/70 group-hover:text-white'
            )}
          />
          <AnimatePresence mode="popLayout">
            {likesCount > 0 && (
              <motion.span
                key={likesCount}
                initial={{ opacity: 0, y: -6, scale: 0.7 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.7 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="text-[11px] font-black text-white leading-none tabular-nums"
              >
                {likesCount >= 1000
                  ? `${(likesCount / 1000).toFixed(1)}k`
                  : likesCount}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </motion.div>

      {/* Add to Album Dialog — outside card so clicks don't bubble */}
      <AddToAlbumDialog
        open={albumDialogOpen}
        onClose={() => setAlbumDialogOpen(false)}
        postId={post.id}
      />
    </>
  );
});

TrendCard.displayName = 'TrendCard';

// ─── TrendDetail (preserved) ───

export const TrendDetail = ({
  post,
  onBack,
}: {
  post: Post;
  onBack: () => void;
}) => {
  const t = useTranslations('Trends');
  const haptic = useHaptic();
  const generate = useGenerateAI();
  const upload = useUpload();
  const { data: userData } = useUser();
  const { data: allModels } = useAIModels();
  const router = useRouter();
  const { bot } = useBot();
  const { user: authUser } = useAuth();
  const userId =
    userData?.user?.user_id ?? (userData?.user as any)?.id ?? authUser?.id;

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const [albumDialogOpen, setAlbumDialogOpen] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  const [userMedia, setUserMedia] = useState<
    Record<number, { url: string; file?: File }>
  >({});
  const [userText] = useState<string>(post.inputs?.text || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState<number | null>(null);

  const tokens = Number(userData?.user?.tokens ?? 0);
  const model = allModels?.find(
    (m: any) => m.tech_name === post.model_tech_name
  );
  const version = model?.versions?.find(
    (v: any) => v.label === post.version_label
  );
  const cost = post.cost ?? version?.cost ?? 15;
  const canAfford = tokens >= cost;

  const mediaSlots = post.inputs?.media || [];

  // Индексы слотов, в которые пользователь может загрузить своё медиа.
  const editableIndexes = mediaSlots
    .map((slot, i) => [slot, i] as const)
    .filter(([slot]) => Boolean(slot.input?.reference?.replace))
    .map(([, i]) => i);

  const botLink = bot?.bot_username
    ? `https://t.me/${bot.bot_username}`
    : undefined;

  // Применяем вставленную ссылку как медиа-вложение для генерации.
  // sanitizeMediaUrl чинит вставленную из чата/письма ссылку (%0A, пробелы).
  const applyLink = () => {
    const url = sanitizeMediaUrl(linkValue);
    if (!url) {
      toast.error(t('linkMediaInvalid'));
      return;
    }
    const target =
      activeMediaIndex ??
      editableIndexes.find((i) => !userMedia[i]) ??
      editableIndexes[0] ??
      0;
    setUserMedia((prev) => ({ ...prev, [target]: { url } }));
    setLinkValue('');
    setActiveMediaIndex(null);
    setIsLinkOpen(false);
    haptic.success();
    toast.success(t('done'));
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const indexSnapshot = activeMediaIndex;

    // КРИТИЧЕСКИЙ ФИКС: Сбрасываем стейты только ПОСЛЕ проверки наличия файла, 
    // чтобы Face ID / Blur на iOS не затирали контекст операции до завершения.
    if (!file || indexSnapshot === null) {
      setActiveMediaIndex(null);
      setFileInputKey((k) => k + 1);
      return;
    }

    try {
      const uploaded = await upload.mutateAsync(file);
      setUserMedia((prev) => ({
        ...prev,
        [indexSnapshot]: { url: uploaded.url, file },
      }));
      toast.success(t('done'));
    } catch {
      toast.error(t('uploadErrorLink'), {
        action: {
          label: t('linkMedia'),
          onClick: () => {
            setActiveMediaIndex(indexSnapshot);
            setIsLinkOpen(true);
          },
        },
      });
    } finally {
      // Чистим стейты строго в самом конце
      setActiveMediaIndex(null);
      setFileInputKey((k) => k + 1);
    }
  };

  const handleGenerate = () => {
    if (!canAfford) {
      toast.error(t('insufficientCredits'));
      return;
    }
    haptic.medium();
    const finalMedia = mediaSlots.map((slot, index) => {
      const override = userMedia[index];
      const type = slot.type === 'media' ? 'image' : slot.type || 'image';
      return {
        type,
        format: 'url',
        input: override
          ? override.url
          : (slot.input as any)?.input || slot.input,
      };
    });
    const inputs = convertMediaToInputs(userText, finalMedia as any);
    generate.mutate(
      {
        tech_name: post.model_tech_name,
        version: post.version_label,
        inputs,
        params: post.params,
        post_id: post.id,
      },
      {
        onSuccess: (data) => {
          if (data.dialogue_id) router.push(`/chats/${data.dialogue_id}`);
        },
      }
    );
  };

  const handleShareTelegram = () => {
    haptic.light();
    const botUsername = bot?.bot_username || 'bot';
    const appLink = `https://t.me/${botUsername}?startapp=post-${post.id}${userId ? `_ref-${userId}` : ''}`;
    const text = post.inputs?.text || '';
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(appLink)}&text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank');
    setIsShareOpen(false);
  };

  const handleShareWeb = () => {
    haptic.light();
    const webLink = `${window.location.origin}/trend/${post.id}${userId ? `?ref=${userId}` : ''}`;
    if (typeof navigator.share === 'function') {
      navigator
        .share({ title: post.inputs?.text || 'AI Generation', url: webLink })
        .catch(() => { });
      setIsShareOpen(false);
    } else {
      navigator.clipboard.writeText(webLink).then(() => {
        haptic.success();
        toast.success(t('linkCopied') || 'Ссылка скопирована!');
        setIsShareOpen(false);
      });
    }
  };

  const resultMedia = post.result?.media?.[0];
  const mediaUrl = resultMedia?.input || post.result?.url;
  const mediaIsVideo = isVideoMedia(mediaUrl, resultMedia?.type);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="flex flex-col min-h-screen"
    >
      <header className="sticky top-0 z-50 px-6 py-5 flex items-center gap-4">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-all active:scale-90"
        >
          <ChevronLeft size={20} className="text-cyan-400" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-[17px] font-black tracking-tight text-white truncate leading-tight">
            {post.inputs?.text || t('title')}
          </h2>
          <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest mt-0.5">
            {post.model_name || 'AI GENERATION'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              haptic.light();
              setAlbumDialogOpen(true);
            }}
            className="w-auto h-auto py-3 px-4 rounded-full text-cyan-400 font-black text-sm gap-2 bg-white/5 border border-white/10 flex items-center justify-center transition-all active:scale-90 shrink-0"
          >
            <FolderPlus size={18} className="text-cyan-400" />
            {t('addToAlbum')}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col gap-10">
        <div className="relative aspect-3/4 rounded-[40px] overflow-hidden border border-white/10 shadow-[0_32px_64px_rgba(0,0,0,0.6)]">
          {mediaUrl ? (
            mediaIsVideo ? (
              <video
                src={mediaUrl}
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <img
                src={mediaUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            )
          ) : (
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
              <Sparkles className="size-16 text-white/5" />
            </div>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute bottom-8 left-8 right-8">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[24px] flex-1">
                <p className="text-[11px] font-black text-white/40 uppercase tracking-widest mb-1">
                  {t('model')}
                </p>
                <p className="text-[15px] font-black text-white truncate">
                  {post.model_name ||
                    post.model_tech_name.replace(/^sosana\//, '')}
                </p>
              </div>
              <div className="p-4 bg-cyan-400/20 backdrop-blur-2xl border border-cyan-400/30 rounded-[24px] text-center min-w-[80px]">
                <p className="text-[11px] font-black text-cyan-400 uppercase tracking-widest mb-1">
                  COST
                </p>
                <p className="text-[15px] font-black text-white">{cost} ◈</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-full items-center justify-center">
          <button
            onClick={() => {
              haptic.light();
              setIsShareOpen(true);
            }}
            className="w-full text-cyan-400 font-black text-base gap-2 py-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center transition-all active:scale-90 shrink-0"
          >
            <Share2 size={20} className="" />
            <span>{t('share')}</span>
          </button>
        </div>

        <div className="flex flex-col gap-8">
          {mediaSlots.some((s) => s.input?.reference?.replace) && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3 px-2">
                <h3 className="text-[13px] font-black uppercase tracking-[0.15em] text-white/30">
                  {t('uploadMedia')}
                </h3>
                <button
                  onClick={() => {
                    haptic.light();
                    setActiveMediaIndex(null);
                    setIsLinkOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-full bg-cyan-400/10 border border-cyan-400/25 px-3 py-1.5 text-[12px] font-black text-cyan-300 transition-all active:scale-90 hover:bg-cyan-400/20"
                >
                  <Link2 size={14} />
                  {t('linkMedia')}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {mediaSlots.map((slot, index) => {
                  const { hide, replace } = slot.input?.reference || {};
                  if (hide && !replace) return null;
                  const current = userMedia[index];
                  const originalUrl = (slot.input as any)?.input;
                  return (
                    <div
                      key={index}
                      onClick={() => {
                        if (replace || hide) {
                          // ФИКС: Сначала очищаем значение инпута, сохраняем индекс, И ТОЛЬКО ПОТОМ открываем.
                          // Никаких изменений key инпута прямо здесь!
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                          setActiveMediaIndex(index);
                          // Используем setTimeout, чтобы гарантировать корректный фокус в WebView iOS
                          setTimeout(() => {
                            fileInputRef.current?.click();
                          }, 50);
                        }
                      }}
                      className={cn(
                        'relative aspect-square rounded-[32px] overflow-hidden border transition-all flex flex-col items-center justify-center gap-3',
                        replace || hide
                          ? 'cursor-pointer active:scale-95 bg-zinc-900/50 border-white/10 hover:border-white/20'
                          : 'bg-zinc-900 border-transparent',
                        current &&
                        'border-cyan-400/50 bg-cyan-400/5 shadow-[0_0_20px_rgba(34,211,238,0.1)]'
                      )}
                    >
                      {current ? (
                        <>
                          <img
                            src={
                              current.file
                                ? URL.createObjectURL(current.file)
                                : current.url
                            }
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
                          <CheckCircle2
                            size={32}
                            className="text-cyan-400 relative z-10"
                          />
                        </>
                      ) : !hide && originalUrl && originalUrl !== 'null' ? (
                        <>
                          <img
                            src={originalUrl}
                            className="absolute inset-0 w-full h-full object-cover opacity-30"
                          />
                          <Camera
                            size={24}
                            className="text-white/40 relative z-10"
                          />
                          <p className="text-[11px] font-black text-white/40 uppercase tracking-widest relative z-10 text-center px-4">
                            {t('uploadMediaDesc')}
                          </p>
                        </>
                      ) : (
                        <>
                          <Camera size={28} className="text-white/20" />
                          <p className="text-[11px] font-black text-white/20 uppercase tracking-widest text-center px-4">
                            {t('uploadMediaDesc')}
                          </p>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <h3 className="text-[13px] font-black uppercase tracking-[0.15em] text-white/30 px-2">
              {t('prompt')}
            </h3>
            {post.inputs?.hide_text ? (
              <div className="p-6 rounded-[32px] bg-cyan-400/5 border border-cyan-400/20 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-400/20 flex items-center justify-center">
                  <Lock size={20} className="text-cyan-400" />
                </div>
                <p className="text-[15px] font-bold text-cyan-400/70 leading-tight">
                  {t('promptHidden')}
                </p>
              </div>
            ) : (
              <div className="p-6 rounded-[32px] bg-zinc-900/40 border border-white/5">
                <p className="text-[16px] font-medium text-white/90 leading-relaxed italic">
                  "{post.inputs?.text || t('noPrompt')}"
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 px-6 pt-6 pb-[calc(24px+max(12px,env(safe-area-inset-bottom)))] bg-black/80 backdrop-blur-3xl border-t border-white/5">
        <button
          disabled={generate.isPending}
          onClick={handleGenerate}
          className={cn(
            'w-full h-16 rounded-[24px] flex items-center justify-center gap-3 font-black text-[17px] transition-all active:scale-[0.98] shadow-2xl',
            canAfford
              ? 'bg-cyan-400 text-white shadow-[0_0_30px_rgba(34,211,238,0.4)]'
              : 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
          )}
        >
          {generate.isPending ? (
            <Loader2 className="animate-spin" />
          ) : canAfford ? (
            <>
              <Zap size={20} fill="currentColor" />
              {t('generate')}
            </>
          ) : (
            <>
              <Lock size={18} />
              {t('insufficientCredits')}
            </>
          )}
        </button>
      </div>

      {/* КРИТИЧЕСКИЙ ФИКС СТИЛЕЙ ИНПУТА ДЛЯ iOS: 
          Вместо className="hidden" (display: none), который iOS WebView отрубает при FaceID, 
          делаем его невидимым через opacity и pointer-events, сохраняя в физическом DOM. */}
      <input
        key={fileInputKey}
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{
          opacity: 0,
          position: 'absolute',
          pointerEvents: 'none',
          width: '1px',
          height: '1px',
        }}
      />

      <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
        <DialogContent className="bg-zinc-950/90 border-white/10 text-white max-w-md p-6 rounded-[32px] backdrop-blur-2xl shadow-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-[20px] font-black tracking-tight text-white">
              {t('shareTrend')}
            </DialogTitle>
            <DialogDescription className="hidden" />
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <button
              onClick={handleShareTelegram}
              className="w-full flex items-center gap-4 p-5 rounded-3xl bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/20 transition-all text-left group active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-2xl bg-cyan-400/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform shrink-0">
                <Send size={22} className="ml-[-2px] mt-[1px]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-black text-white leading-tight">
                  {t('tgAppLink')}
                </p>
                <p className="text-[12px] text-white/45 font-medium mt-1.5 uppercase tracking-wider">
                  {t('tgAppLinkDesc')}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 shrink-0">
                <Send size={16} className="ml-[-1px] mt-[1px]" />
              </div>
            </button>
            <button
              onClick={handleShareWeb}
              className="w-full flex items-center gap-4 p-5 rounded-3xl bg-zinc-900/40 hover:bg-zinc-900/60 border border-white/5 transition-all text-left group active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 group-hover:scale-105 transition-transform shrink-0">
                <Globe size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-black text-white leading-tight">
                  {t('webBrowserLink')}
                </p>
                <p className="text-[12px] text-white/45 font-medium mt-1.5 uppercase tracking-wider">
                  {t('webBrowserLinkDesc')}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/45 group-hover:text-cyan-400 transition-colors shrink-0">
                <Copy size={16} />
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isLinkOpen} onOpenChange={setIsLinkOpen}>
        <DialogContent className="bg-zinc-950/95 border-white/10 text-white max-w-md p-0 rounded-[32px] backdrop-blur-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="p-6 pb-3 shrink-0">
            <DialogTitle className="text-[20px] font-black tracking-tight text-white">
              {t('linkMediaTitle')}
            </DialogTitle>
            <DialogDescription className="hidden" />
          </DialogHeader>

          <div className="flex flex-col gap-5 overflow-y-auto px-6 pb-6">
            {/* Поле ввода ссылки — на самом верху */}
            <div className="flex flex-col gap-3">
              <Input
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyLink();
                }}
                placeholder={t('linkMediaPlaceholder')}
                inputMode="url"
                autoComplete="off"
                className="h-12 rounded-2xl border-white/10 bg-white/5 px-4 text-[15px] text-white placeholder:text-white/30"
              />
              <button
                onClick={applyLink}
                className="h-12 w-full rounded-2xl bg-cyan-400 font-black text-[15px] text-white shadow-[0_0_24px_rgba(34,211,238,0.35)] transition-all active:scale-[0.98]"
              >
                {t('linkMediaApply')}
              </button>
            </div>

            {/* Инструкция */}
            <div className="flex flex-col gap-3">
              <p className="text-[13px] font-bold text-white/50">
                {t('linkMediaInstruction')}
              </p>
              <ol className="flex flex-col gap-2.5">
                {[
                  botLink ? (
                    <a
                      href={botLink}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-cyan-400 underline underline-offset-2"
                    >
                      {t('linkStep1')}
                    </a>
                  ) : (
                    t('linkStep1')
                  ),
                  t('linkStep2'),
                  t('linkStep3'),
                  t('linkStep4'),
                  t('linkStep5'),
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-cyan-400/15 text-[11px] font-black text-cyan-300">
                      {i + 1}
                    </span>
                    <span className="text-[14px] leading-tight text-white/80">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Картинка-подсказка */}
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <img
                src="/instruction-image.jpg"
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddToAlbumDialog
        open={albumDialogOpen}
        onClose={() => setAlbumDialogOpen(false)}
        postId={post.id}
      />
    </motion.div>
  );
};

export default Trends;