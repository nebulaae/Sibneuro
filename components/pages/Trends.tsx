'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { usePosts, Post } from '@/hooks/usePosts';
import { useUser } from '@/hooks/useUser';
import { useAIModels } from '@/hooks/useModels';
import { useGenerateAI, convertMediaToInputs } from '@/hooks/useGenerations';
import { useUpload, useUI } from '@/hooks/useApiExtras';
import { useHaptic } from '@/hooks/useHaptic';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Sparkles,
  ImagePlus,
  X,
  ChevronLeft,
  Lock,
  ArrowRight,
  Heart,
  Camera,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, localize, cleanModelName } from '@/lib/utils';
import { getPostResultImage, getPostResultMedia } from '@/hooks/usePosts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';

/* ── Glass Styles ── */
const glassThin =
  'bg-white/[.07] dark:bg-black/[.45] backdrop-blur-xl backdrop-saturate-150 border border-white/[.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]';
const glassRegular =
  'bg-white/[.10] dark:bg-black/[.55] backdrop-blur-2xl backdrop-saturate-180 border border-white/[.18] shadow-[inset_0_1px_0_rgba(255,255,255,0.20),0_4px_16px_rgba(0,0,0,0.22)]';
const glassThick =
  'bg-white/[.13] dark:bg-black/[.65] backdrop-blur-3xl backdrop-saturate-200 border border-white/[.22] shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_32px_rgba(0,0,0,0.28)]';
const glassBlue =
  'bg-[rgba(0,122,255,0.85)] backdrop-blur-xl border border-[rgba(0,122,255,0.30)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_24px_rgba(0,122,255,0.38)]';
const spring =
  'transition-all duration-[280ms] [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]';

export const Trends = () => {
  const t = useTranslations('Trends');
  const router = useRouter();
  const searchParams = useSearchParams();
  const postParam = searchParams.get('post');
  const haptic = useHaptic();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const { data: postsData, isLoading: postsLoading, isError } = usePosts({ limit: 50 });
  const posts = postsData?.items || [];

  useEffect(() => {
    if (postParam && posts.length > 0) {
      const p = posts.find((x: Post) => x.id === parseInt(postParam));
      if (p) setSelectedPost(p);
    } else if (!postParam) {
      setSelectedPost(null);
    }
  }, [postParam, posts]);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center">
        <AlertCircle className="size-12 text-white/20 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">{t('error')}</h2>
        <p className="text-white/50">{t('errorDesc')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <AnimatePresence>
        {!selectedPost ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="px-5 pt-8"
          >
            <div className="mb-8">
              <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2 flex items-center gap-2">
                <span className="bg-linear-to-r from-sky-600 via-sky-400 to-sky-500 bg-clip-text text-transparent">
                  {t('title')}
                </span>
                <Sparkles className="size-6 text-sky-400" />
              </h1>
              <p className="text-white/50 text-[15px] leading-relaxed max-w-[300px]">
                {t('subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {postsLoading ? (
                Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className={cn('aspect-3/4 rounded-2xl animate-pulse', glassThin)} />
                ))
              ) : (
                posts.map((post: Post) => (
                  <TrendCard
                    key={post.id}
                    post={post}
                    onClick={() => {
                      haptic.light();
                      setSelectedPost(post);
                    }}
                  />
                ))
              )}
            </div>
          </motion.div>
        ) : (
          <TrendDetail
            post={selectedPost}
            onBack={() => {
              haptic.light();
              setSelectedPost(null);
              router.replace('/trends');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const TrendCard = ({ post, onClick }: { post: Post; onClick: () => void }) => {
  const t = useTranslations('Trends');
  // Finding a price/cost is tricky because it's in the model version, but posts might have a priority or we can show likes
  // In the screenshot there is a "diamond 15" badge. We'll use a placeholder or check if result has cost.
  // Usually posts are made with a specific version, we can try to guess the cost.
  const cost = 15; // Placeholder like in screenshot

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={cn(
        'relative aspect-3/4 rounded-2xl overflow-hidden cursor-pointer group',
        glassThin
      )}
    >
      {(() => {
        const media = getPostResultMedia(post);
        if (!media) return (
          <div className="absolute inset-0 flex items-center justify-center bg-white/5">
            <Sparkles className="size-8 text-white/10" />
          </div>
        );
        if (media.type === 'video') {
          return (
            <video
              src={media.url}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          );
        }
        return (
          <img
            src={media.url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        );
      })()}

      {/* Badges */}
      <div className="absolute top-2 left-2 flex flex-col gap-1">
        {post.priority > 5 && (
          <div className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-lg">
            {t('new')}
          </div>
        )}
      </div>

      <div className="absolute top-2 right-2">
        <div className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-bold text-white', glassThick)}>
          💎 {post.cost || 15}
        </div>
      </div>

      {/* Footer */}
      <div className="absolute inset-x-0 bottom-0 p-3 bg-linear-to-t from-black/80 via-black/40 to-transparent">
        <p className="text-white text-[13px] font-semibold line-clamp-2 leading-snug">
          {post.name || post.inputs?.text || 'Untitled Trend'}
        </p>
      </div>
    </motion.div>
  );
};

const TrendDetail = ({ post, onBack }: { post: Post; onBack: () => void }) => {
  const t = useTranslations('Trends');
  const haptic = useHaptic();
  const generate = useGenerateAI();
  const upload = useUpload();
  const { data: userData } = useUser();
  const { data: allModels } = useAIModels();
  const router = useRouter();

  const [userMedia, setUserMedia] = useState<Record<number, { url: string; file?: File }>>({});
  const [brokenImages, setBrokenImages] = useState<Record<number, boolean>>({});
  const [userText, setUserText] = useState<string>(post.inputs?.text || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState<number | null>(null);

  const tokens = userData?.user?.tokens ?? 0;
  
  // Find model and version to get the real cost
  const model = allModels?.find((m: any) => m.tech_name === post.model_tech_name);
  const version = model?.versions?.find((v: any) => v.label === post.version_label);
  const cost = post.cost || version?.cost || 15;
  const canAfford = tokens >= cost;

  // Identify slots that can be replaced
  const mediaSlots = post.inputs?.media || [];
  const replacableSlots = mediaSlots.filter(s => s.input?.reference?.replace);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || activeMediaIndex === null) return;

    try {
      const uploaded = await upload.mutateAsync(file);
      setUserMedia(prev => ({
        ...prev,
        [activeMediaIndex]: { url: uploaded.url, file }
      }));
      toast.success(t('done'));
    } catch {
      toast.error(t('error'));
    }
    setActiveMediaIndex(null);
  };

  const handleGenerate = () => {
    if (!canAfford) {
      toast.error(t('insufficientCredits'));
      return;
    }

    haptic.medium();

    // Prepare inputs
    const finalMedia = mediaSlots.map((slot, index) => {
      const override = userMedia[index];
      // Use slot.input.type if it was 'media' at top level
      const realType = (slot.input?.type && slot.input.type !== 'media') ? slot.input.type : (slot.type === 'media' ? 'image' : slot.type);
      return {
        type: realType || 'image',
        format: 'url',
        input: override ? override.url : slot.input?.input
      };
    });

    const inputs = convertMediaToInputs(userText, finalMedia as any);

    generate.mutate({
      tech_name: post.model_tech_name,
      version: post.version_label,
      inputs,
      params: post.params,
      post_id: post.id
    }, {
      onSuccess: (data) => {
        if (data.dialogue_id) {
          router.push(`/chats/${data.dialogue_id}`);
        }
      }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col min-h-screen max-w-2xl mx-auto w-full bg-black/20"
    >
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center gap-4 px-4 py-3 bg-black/50 backdrop-blur-xl border-b border-white/10">
        <button onClick={onBack} className="p-2 -ml-2 text-white/70 active:scale-90 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-[17px] font-bold text-white truncate">
             {t('title')}
          </h2>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        {/* Main Preview */}
        <div className="relative aspect-3/4 rounded-3xl overflow-hidden mb-6 shadow-2xl border border-white/10">
          {(() => {
            const media = getPostResultMedia(post);
            if (!media) return <div className="absolute inset-0 bg-white/5 flex items-center justify-center"><Sparkles className="size-10 text-white/10" /></div>;
            if (media.type === 'video') {
              return <video src={media.url} autoPlay muted loop playsInline className="w-full h-full object-cover" />;
            }
            return <img src={media.url} alt="" className="w-full h-full object-cover" />;
          })()}
          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-5 left-5 right-5">
             <div className="flex items-center gap-3">
                 <div className={cn("px-3 py-1.5 rounded-xl flex items-center gap-2", glassThick)}>
                   <span className="text-[12px] font-bold text-white/50">{t('model')}:</span>
                   <span className="text-[13px] font-bold text-white">{post.model_name || cleanModelName(post.model_tech_name)}</span>
                 </div>
             </div>
          </div>
        </div>

        {/* Info & Replaceable Slots */}
        <div className="flex flex-col gap-6 mb-10">
          {/* Media Slots */}
          {mediaSlots.some(s => !(s.input?.reference?.hide && !s.input?.reference?.replace)) && (
            <div className="space-y-4">
              <label className="text-[12px] font-bold uppercase tracking-wider text-white/40 px-1">
                {t('uploadMedia')}
              </label>
              
              <div className="grid grid-cols-2 gap-3">
                {mediaSlots.map((slot, index) => {
                  const { hide, replace } = slot.input?.reference || {};
                  if (hide && !replace) return null;

                  const current = userMedia[index];
                  const originalUrl = slot.input?.input;
                  
                  return (
                    <div
                      key={index}
                      onClick={() => {
                        if (replace || hide) {
                          setActiveMediaIndex(index);
                          fileInputRef.current?.click();
                        }
                      }}
                      className={cn(
                        "relative aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 border border-white/10 overflow-hidden transition-all",
                        (replace || hide) ? "cursor-pointer active:scale-[0.98]" : "cursor-default",
                        glassThin,
                        current && "border-blue-500/40"
                      )}
                    >
                      {current ? (
                        <>
                          <img src={current.file ? URL.createObjectURL(current.file) : current.url} className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
                          <div className="relative z-10 flex flex-col items-center gap-1">
                             <CheckCircle2 className="size-6 text-blue-400" />
                             <span className="text-[10px] font-bold text-white uppercase tracking-wider">{t('done')}</span>
                          </div>
                          {replace && (
                            <button 
                              className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white z-20"
                              onClick={(e) => {
                                e.stopPropagation();
                                setUserMedia(prev => {
                                  const next = {...prev};
                                  delete next[index];
                                  return next;
                                });
                              }}
                            >
                              <X size={12} />
                            </button>
                          )}
                        </>
                      ) : !hide && originalUrl && !brokenImages[index] ? (
                        <>
                          <img 
                            src={originalUrl} 
                            className="absolute inset-0 w-full h-full object-cover opacity-60" 
                            onError={() => setBrokenImages(prev => ({ ...prev, [index]: true }))}
                          />
                          {replace && (
                             <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                <div className={cn("p-2 rounded-xl", glassRegular)}>
                                  <Camera className="size-5 text-white" />
                                </div>
                             </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className={cn("p-3 rounded-xl", glassRegular)}>
                            <Camera className="size-6 text-white/50" />
                          </div>
                          <div className="text-center px-2">
                            <p className="text-[11px] font-bold text-white/80">{t('uploadMediaDesc')}</p>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
             <label className="text-[12px] font-bold uppercase tracking-wider text-white/40 px-1">
                {t('prompt')}
             </label>
             {post.inputs?.hide_text ? (
               <div className={cn("flex items-center gap-3 p-4 rounded-2xl", glassThin, "border-blue-500/20 bg-blue-500/5")}>
                 <Lock className="size-4 text-blue-400" />
                 <p className="text-[14px] text-blue-100/70">
                   {t('promptHidden')}
                 </p>
               </div>
             ) : (
               <div className={cn("p-4 rounded-2xl", glassThin)}>
                 <p className="text-[14px] text-white/90 leading-relaxed">
                   {post.inputs?.text || 'No text prompt'}
                 </p>
               </div>
             )}
          </div>
        </div>
      </div>

      {/* Bottom Action */}
      <div className="sticky bottom-0 p-5 bg-black/80 backdrop-blur-2xl border-t border-white/10">
        <button
          disabled={generate.isPending}
          onClick={handleGenerate}
          className={cn(
            "w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-bold text-[16px] transition-all active:scale-[0.97]",
            canAfford 
              ? "bg-linear-to-r from-blue-600 to-blue-500 text-white shadow-[0_8px_20px_-4px_rgba(37,99,235,0.4)]"
              : "bg-white/5 text-white/40 border border-white/10 cursor-not-allowed"
          )}
        >
          {generate.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <>
              {canAfford ? (
                <>
                  <Sparkles size={18} />
                  {t('generate')}
                </>
              ) : (
                <>
                  <Lock size={16} />
                  {t('insufficientCredits')}
                </>
              )}
            </>
          )}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
    </motion.div>
  );
};
