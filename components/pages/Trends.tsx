'use client';

import { memo, useCallback, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronLeft,
  Copy,
  Globe,
  Loader2,
  Lock,
  Play,
  Send,
  Share2,
  Sparkles,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useInfinitePosts, Post, getPostResultMedia } from '@/hooks/usePosts';
import { useGenerateAI, convertMediaToInputs } from '@/hooks/useGenerations';
import { useUpload } from '@/hooks/useApiExtras';
import { useAIModels } from '@/hooks/useModels';
import { useUser } from '@/hooks/useUser';
import { useAuth } from '@/hooks/useAuth';
import { useBot } from '@/app/providers/BotProvider';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn, cleanModelName } from '@/lib/utils';
import { useHaptic } from '@/hooks/useHaptic';

const shell = 'min-h-svh text-white pb-[calc(92px+max(16px,env(safe-area-inset-bottom)))]';

export const Trends = () => {
  const t = useTranslations('Trends');
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfinitePosts({ limit: 12 });
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
        { rootMargin: '320px' }
      );
      if (node) observer.current.observe(node);
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  if (isError) {
    return (
      <div className={cn(shell, 'grid place-items-center p-8 text-center')}>
        <div className="flex max-w-xs flex-col items-center gap-5">
          <div className="grid size-20 place-items-center rounded-[30px] border border-red-400/20 bg-red-500/10">
            <AlertCircle className="size-9 text-red-300" />
          </div>
          <div>
            <h1 className="text-2xl font-black">{t('error')}</h1>
            <p className="mt-2 text-white/45">{t('errorDesc')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={shell}>
      <main className="mx-auto w-full max-w-5xl px-5 pt-10">
        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200/15 bg-cyan-200/8 px-3 py-1.5 text-[12px] font-bold text-cyan-100/70 backdrop-blur-xl">
              <Sparkles className="size-3.5" />
              {t('community')}
            </div>
            <h1 className="text-[40px] font-black leading-none tracking-tight text-cyan-100">
              {t('title')}
            </h1>
            <p className="mt-3 max-w-[420px] text-[15px] leading-6 text-white/45">
              {t('subtitle')}
            </p>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="aspect-3/4 animate-pulse rounded-[28px] border border-white/10 bg-white/8"
              />
            ))
            : posts.map((post, index) => (
              <div
                key={post.id}
                ref={index === posts.length - 1 ? lastPostRef : null}
              >
                <TrendCard post={post} />
              </div>
            ))}
        </div>

        {isFetchingNextPage && (
          <div className="flex justify-center py-10">
            <Loader2 className="size-7 animate-spin text-white/35" />
          </div>
        )}
      </main>
    </div>
  );
};

const TrendCard = memo(({ post }: { post: Post }) => {
  const t = useTranslations('Trends');
  const router = useRouter();
  const haptic = useHaptic();
  const media = getPostResultMedia(post);
  const title = (post as Post & { name?: string }).name || post.inputs?.text || t('trend');

  return (
    <button
      onClick={() => {
        haptic.light();
        try {
          sessionStorage.setItem(`trend_post_${post.id}`, JSON.stringify(post));
        } catch { }
        router.push(`/trend/${post.id}`);
      }}
      className="group relative aspect-3/4 w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/7 text-left shadow-[0_18px_54px_rgba(0,0,0,0.28)] transition hover:border-cyan-100/25 active:scale-[0.98]"
    >
      {media ? (
        media.type === 'video' ? (
          <video
            src={media.url}
            muted
            loop
            playsInline
            className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105"
            onMouseEnter={(e) => e.currentTarget.play()}
            onMouseLeave={(e) => e.currentTarget.pause()}
          />
        ) : (
          <img
            src={media.url}
            alt=""
            className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105"
          />
        )
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-linear-to-br from-cyan-300/10 to-white/5">
          <Sparkles className="size-8 text-white/20" />
        </div>
      )}
      <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/15 to-transparent" />
      <div className="absolute right-3 top-3 rounded-full border border-white/15 bg-black/35 px-2.5 py-1 text-[11px] font-black backdrop-blur-xl">
        {post.cost ?? 15} <span className="text-cyan-200">◆</span>
      </div>
      {media?.type === 'video' && (
        <div className="absolute left-3 top-3 grid size-9 place-items-center rounded-full border border-white/20 bg-black/35 backdrop-blur-xl">
          <Play className="size-4 fill-white" />
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h2 className="line-clamp-2 text-[14px] font-black leading-tight">
          {title}
        </h2>
        <p className="mt-1 text-[11px] font-semibold text-white/35">
          {post.model_name || cleanModelName(post.model_tech_name)}
        </p>
      </div>
    </button>
  );
});

TrendCard.displayName = 'TrendCard';

export const TrendDetail = ({ post, onBack }: { post: Post; onBack: () => void }) => {
  const t = useTranslations('Trends');
  const haptic = useHaptic();
  const router = useRouter();
  const generate = useGenerateAI();
  const upload = useUpload();
  const { data: userData } = useUser();
  const { data: allModels } = useAIModels();
  const { bot } = useBot();
  const { user: authUser } = useAuth();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [copiedType, setCopiedType] = useState<'tg' | 'web' | null>(null);
  const [userMedia, setUserMedia] = useState<Record<number, { url: string; file?: File }>>({});
  const [activeMediaIndex, setActiveMediaIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const media = getPostResultMedia(post);
  const tokens = userData?.user?.tokens ?? 0;
  const model = allModels?.find((m) => m.tech_name === post.model_tech_name);
  const version = model?.versions?.find((v) => v.label === post.version_label);
  const cost = post.cost ?? version?.cost ?? 15;
  const canAfford = tokens >= cost;
  const mediaSlots = post.inputs?.media || [];
  const userId = userData?.user?.user_id ?? authUser?.id;

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || activeMediaIndex === null) return;
    try {
      const uploaded = await upload.mutateAsync(file);
      setUserMedia((prev) => ({ ...prev, [activeMediaIndex]: { url: uploaded.url, file } }));
      toast.success(t('done'));
    } catch {
      toast.error(t('error'));
    } finally {
      setActiveMediaIndex(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGenerate = () => {
    if (!canAfford) {
      toast.error(t('insufficientCredits'));
      return;
    }

    haptic.medium();
    const finalMedia: { type: string; format: string; input: string }[] = mediaSlots.map((slot, index) => {
      const override = userMedia[index];
      const slotInput = slot.input as Partial<Post['inputs']['media'][number]['input']>;
      const type = slotInput?.type && slotInput.type !== 'media' ? slotInput.type : slot.type === 'media' ? 'image' : slot.type;
      return {
        type: type || 'image',
        format: 'url',
        input: override?.url || slotInput?.input || '',
      };
    });

    generate.mutate(
      {
        tech_name: post.model_tech_name,
        version: post.version_label,
        inputs: convertMediaToInputs(post.inputs?.text || '', finalMedia),
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

  // Нативный шаринг в Telegram — открывает диалог выбора чата
  const handleShareTelegram = () => {
    haptic.light();
    const botUsername = bot?.bot_username || 'bot';
    const appLink = `https://t.me/${botUsername}?startapp=post-${post.id}${userId ? `_ref-${userId}` : ''}`;
    const text = post.inputs?.text || '';
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(appLink)}&text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank');
    setIsShareOpen(false);
  };

  // Web Share API для браузера — нативный шит на мобиле, fallback копирование на десктопе
  const handleShareWeb = () => {
    haptic.light();
    const webLink = `${window.location.origin}/trend/${post.id}${userId ? `?ref=${userId}` : ''}`;
    if (typeof navigator.share === 'function') {
      navigator
        .share({
          title: post.inputs?.text || 'AI Generation',
          url: webLink,
        })
        .catch(() => {
          // пользователь отменил — ничего не делаем
        });
      setIsShareOpen(false);
    } else {
      // fallback для десктопа
      navigator.clipboard.writeText(webLink).then(() => {
        haptic.success();
        toast.success(t('linkCopied') || 'Ссылка скопирована!');
        setIsShareOpen(false);
      });
    }
  };


  return (
    <div className="min-h-screen text-white">
      <header className="sticky top-0 z-50 flex items-center gap-3 px-5 py-4">
        <button
          onClick={onBack}
          className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/7 transition active:scale-90"
        >
          <ChevronLeft className="size-5 text-cyan-100" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-black tracking-tight">
            {(post as Post & { name?: string }).name || post.inputs?.text || t('title')}
          </h1>
          <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/35">
            {post.model_name || cleanModelName(post.model_tech_name)}
          </p>
        </div>
        <button
          onClick={() => setIsShareOpen(true)}
          className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/7 transition active:scale-90"
        >
          <Share2 className="size-5 text-cyan-100" />
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 py-6 pb-32">
        <section className="relative aspect-3/4 overflow-hidden rounded-[34px] border border-white/10 bg-white/7 shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
          {media ? (
            media.type === 'video' ? (
              <video src={media.url} controls playsInline className="size-full object-cover" />
            ) : (
              <img src={media.url} alt="" className="size-full object-cover" />
            )
          ) : (
            <div className="grid size-full place-items-center">
              <Sparkles className="size-12 text-white/15" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 to-transparent p-5">
            <div className="flex gap-3">
              <div className="min-w-0 flex-1 rounded-3xl border border-white/12 bg-white/10 p-4 backdrop-blur-2xl">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/35">
                  {t('model')}
                </p>
                <p className="mt-1 truncate text-[15px] font-black">
                  {post.model_name || cleanModelName(post.model_tech_name)}
                </p>
              </div>
              <div className="rounded-3xl border border-cyan-200/20 bg-cyan-200/10 p-4 text-center backdrop-blur-2xl">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/55">
                  {t('cost')}
                </p>
                <p className="mt-1 text-[15px] font-black">{cost} ◆</p>
              </div>
            </div>
          </div>
        </section>

        {mediaSlots.some((slot) => slot.input?.reference?.replace) && (
          <section>
            <h2 className="mb-3 px-1 text-[12px] font-black uppercase tracking-[0.18em] text-white/35">
              {t('uploadMedia')}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {mediaSlots.map((slot, index) => {
                const slotInput = slot.input as Partial<Post['inputs']['media'][number]['input']>;
                const { hide, replace } = slotInput?.reference || {};
                if (hide && !replace) return null;
                const current = userMedia[index];
                const originalUrl = slotInput?.input;

                return (
                  <button
                    key={index}
                    onClick={() => {
                      if (replace || hide) {
                        setActiveMediaIndex(index);
                        fileInputRef.current?.click();
                      }
                    }}
                    className={cn(
                      'relative aspect-square overflow-hidden rounded-[28px] border border-white/10 bg-white/7',
                      'grid place-items-center transition active:scale-[0.98]',
                      current && 'border-cyan-200/45'
                    )}
                  >
                    {current ? (
                      <>
                        <img
                          src={current.file ? URL.createObjectURL(current.file) : current.url}
                          alt=""
                          className="absolute inset-0 size-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" />
                        <CheckCircle2 className="relative z-10 size-8 text-cyan-100" />
                      </>
                    ) : originalUrl && !hide ? (
                      <>
                        <img src={originalUrl} alt="" className="absolute inset-0 size-full object-cover opacity-35" />
                        <Camera className="relative z-10 size-7 text-white/55" />
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 px-4 text-center">
                        <Camera className="size-7 text-white/35" />
                        <p className="text-[11px] font-bold text-white/40">
                          {t('uploadMediaDesc')}
                        </p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-3 px-1 text-[12px] font-black uppercase tracking-[0.18em] text-white/35">
            {t('prompt')}
          </h2>
          {post.inputs?.hide_text ? (
            <div className="flex items-center gap-3 rounded-[26px] border border-cyan-200/20 bg-cyan-200/8 p-5">
              <Lock className="size-5 text-cyan-100" />
              <p className="text-[14px] font-semibold text-cyan-100/75">
                {t('promptHidden')}
              </p>
            </div>
          ) : (
            <div className="rounded-[26px] border border-white/10 bg-white/7 p-5">
              <p className="text-[15px] leading-7 text-white/75">
                {post.inputs?.text || t('noPrompt')}
              </p>
            </div>
          )}
          <div className="pb-[calc(18px+max(12px,env(safe-area-inset-bottom)))] pt-6">
            <div className="mx-auto max-w-2xl">
              <button
                disabled={generate.isPending}
                onClick={handleGenerate}
                className={cn(
                  'flex h-15 w-full items-center justify-center gap-3 rounded-[22px] text-[16px] font-black transition active:scale-[0.98]',
                  canAfford
                    ? 'bg-cyan-100 text-black shadow-[0_16px_40px_rgba(125,211,252,0.22)]'
                    : 'border border-white/10 bg-white/7 text-white/35'
                )}
              >
                {generate.isPending ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : canAfford ? (
                  <>
                    <Zap className="size-5" />
                    {t('generate')}
                  </>
                ) : (
                  <>
                    <Lock className="size-5" />
                    {t('insufficientCredits')}
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      </main>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

      {/* Share Modal */}
      <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
        <DialogContent className="bg-zinc-950/90 border-white/10 text-white max-w-md p-6 rounded-[32px] backdrop-blur-2xl shadow-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-[20px] font-black tracking-tight text-white">
              {t('shareTrend')}
            </DialogTitle>
            <DialogDescription className="hidden" />
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* Telegram — нативный шаринг с выбором чата */}
            <button
              onClick={handleShareTelegram}
              className="w-full flex items-center gap-4 p-5 rounded-3xl bg-[#007AFF]/10 hover:bg-[#007AFF]/20 border border-[#007AFF]/20 transition-all text-left group active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#007AFF]/20 border border-[#007AFF]/30 flex items-center justify-center text-[#007AFF] group-hover:scale-105 transition-transform shrink-0">
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
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#007AFF] shrink-0">
                <Send size={16} className="ml-[-1px] mt-[1px]" />
              </div>
            </button>

            {/* Web Share API / fallback копирование */}
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
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/45 group-hover:text-[#007AFF] transition-colors shrink-0">
                <Copy size={16} />
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Trends;