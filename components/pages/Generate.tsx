'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAIModels, useModelParams } from '@/hooks/useModels';
import { useRoles } from '@/hooks/useRoles';
import { convertMediaToInputs, useGenerateAI } from '@/hooks/useGenerations';
import { useUpload } from '@/hooks/useApiExtras';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SmartImage } from '@/components/shared/SmartImage';
import {
  Loader2,
  ChevronLeft,
  ImagePlus,
  X,
  AlertCircle,
  Sparkles,
  Zap,
  CheckCircle2,
  Search,
  Star,
  MessageSquare,
  ImageIcon,
  Film,
  Music,
  Drama,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useHaptic } from '@/hooks/useHaptic';
import { cn, localize } from '@/lib/utils';
import { useLocale, useTranslations } from 'next-intl';
import { getParamLabel, getParamValueLabel } from '@/lib/paramHelpers';
import { describeModel, getModelKind, type ModelKind } from '@/lib/modelMeta';
import { useDragScroll } from '@/hooks/useDragScroll';

function useGenerationStatus(dialogueId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['gen-status', dialogueId],
    queryFn: async () => {
      const { data } = await api.get('/api/history', {
        params: { dialogue_id: dialogueId },
      });
      const msgs = data.messages || data || [];
      return Array.isArray(msgs) ? msgs[msgs.length - 1] : null;
    },
    enabled: !!dialogueId && enabled,
    refetchInterval: 2000,
  });
}

export const Generate = () => {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const modelParam = searchParams.get('model');
  const haptic = useHaptic();
  const t = useTranslations('Generate');

  const [selectedTech, setSelectedTech] = useState<string | null>(modelParam);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [media, setMedia] = useState<
    { type: string; url: string; file?: File }[]
  >([]);
  const [extraParams, setExtraParams] = useState<Record<string, any>>({});
  const [showParams, setShowParams] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: allModels, isLoading } = useAIModels();
  const generate = useGenerateAI();
  const upload = useUpload();
  const models = allModels || [];
  const selected = models.find((m) => m.tech_name === selectedTech);
  const currentVersion =
    selectedVersion ||
    selected?.versions?.find((v) => v.default)?.label ||
    selected?.versions?.[0]?.label;
  const { data: params } = useModelParams(selectedTech, currentVersion);
  const { data: lastMessage } = useGenerationStatus(pendingId, isWaiting);
  const { data: roles } = useRoles();

  // Сегментированный каталог: чат/фото/видео/аудио/роли + поиск + избранное.
  const [segment, setSegment] = useState<ModelKind | 'roles'>('image');
  const [search, setSearch] = useState('');
  const [favOnly, setFavOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  // Драг/колесо-скролл табов каталога на ПК (на тач — нативный скролл).
  const segScrollRef = useDragScroll<HTMLDivElement>();

  useEffect(() => {
    try {
      const raw = localStorage.getItem('generate_favorites');
      if (raw) setFavorites(JSON.parse(raw));
    } catch {}
  }, []);

  const toggleFav = (id: string) => {
    haptic.selection();
    setFavorites((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      try {
        localStorage.setItem('generate_favorites', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (modelParam) setSelectedTech(modelParam);
  }, [modelParam]);
  useEffect(() => {
    if (selected) {
      const def =
        selected.versions?.find((v) => v.default) || selected.versions?.[0];
      setSelectedVersion(def?.label || null);
    }
  }, [selected?.tech_name]);
  useEffect(() => {
    if (!params) return;
    const defaults: Record<string, any> = {};
    params.forEach((p: any) => {
      if (p.default !== undefined) defaults[p.name] = p.default;
    });
    setExtraParams(defaults);
  }, [params]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    try {
      const uploaded = await upload.mutateAsync(files[0]);
      setMedia((prev) => [
        ...prev,
        { type: uploaded.type, url: uploaded.url, file: files[0] },
      ]);
    } catch {
      toast.error(t('uploadError'));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerate = () => {
    if (!selected) return;
    const isTextModel =
      selected.mainCategory === 'text' || selected.categories?.includes('text');
    if (isTextModel) {
      haptic.medium();
      router.push(
        `/chats/new?model=${selected.tech_name}&version=${currentVersion || ''}`
      );
      return;
    }
    if (!prompt.trim() && media.length === 0) {
      toast.error(t('enterDescription'));
      return;
    }
    haptic.medium();
    const oldFormatMedia = media.map((m) => ({
      type: m.type,
      format: 'url',
      input: m.url,
    }));
    const inputs = convertMediaToInputs(prompt.trim() || ' ', oldFormatMedia);
    generate.mutate(
      {
        tech_name: selected.tech_name,
        version: currentVersion || undefined,
        inputs,
        params: Object.keys(extraParams).length > 0 ? extraParams : undefined,
      },
      {
        onSuccess: (data) => {
          const dialogueId = data.dialogue_id;
          if (dialogueId) {
            try {
              sessionStorage.setItem(
                `dialogue_model_${dialogueId}`,
                JSON.stringify({
                  model: selected.tech_name,
                  version: currentVersion || '',
                  role_id: null,
                })
              );
            } catch {}
          }
          if (data.status === 'processing') {
            toast(t('generationStarted'));
            setPendingId(dialogueId || null);
            setIsWaiting(!!dialogueId);
          } else if (dialogueId) {
            haptic.success();
            toast.success(t('done'));
            router.push(`/chats/${dialogueId}`);
          }
        },
      }
    );
  };

  useEffect(() => {
    if (!isWaiting || !lastMessage) return;
    if (lastMessage.status === 'completed') {
      haptic.success();
      setIsWaiting(false);
      toast.success(t('done'));
      if (pendingId) router.push(`/chats/${pendingId}`);
      setPendingId(null);
    } else if (lastMessage.status === 'error') {
      haptic.error();
      setIsWaiting(false);
      toast.error(
        t('errorTitle') + ': ' + (lastMessage.error || t('unknownError'))
      );
      setPendingId(null);
    }
  }, [lastMessage, isWaiting, pendingId, t, router]);

  if (isWaiting && pendingId) {
    const status = lastMessage?.status;
    return (
      <div className="flex flex-col items-center justify-center min-h-svh gap-8 px-6 text-center">
        <div className="w-24 h-24 rounded-[40px] flex items-center justify-center bg-zinc-900 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          {status === 'completed' ? (
            <CheckCircle2 size={36} className="text-cyan-500" />
          ) : status === 'error' ? (
            <AlertCircle size={36} className="text-red-500" />
          ) : (
            <Loader2 size={36} className="animate-spin text-cyan-500" />
          )}
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-[24px] font-black tracking-tight text-white">
            {status === 'completed'
              ? t('done')
              : status === 'error'
                ? t('errorTitle')
                : t('waitingTitle')}
          </p>
          <p className="text-[15px] font-medium text-white/30 max-w-[280px] leading-relaxed">
            {status === 'completed'
              ? t('doneSubtitle')
              : status === 'error'
                ? lastMessage?.error || t('unknownError')
                : t('waitingSubtitle')}
          </p>
        </div>
        <button
          onClick={() => {
            setIsWaiting(false);
            router.push(`/chats/${pendingId}`);
          }}
          className="px-8 py-3 rounded-full bg-white/5 border border-white/10 text-[13px] font-black text-white/40 hover:text-white transition-all"
        >
          {t('goToChat')}
        </button>
      </div>
    );
  }

  if (selected) {
    const cost =
      selected.versions?.find((v) => v.label === currentVersion)?.cost ??
      selected.versions?.[0]?.cost ??
      1;
    const canAttach = selected.input?.some((i) =>
      ['image', 'video', 'audio'].includes(i)
    );
    const isTextModel =
      selected.mainCategory === 'text' || selected.categories?.includes('text');
    const aspectParam = (params || []).find(
      (p: any) => p.name === 'aspect_ratio'
    );

    return (
      <div className="flex flex-col min-h-svh pb-32">
        <header className="sticky top-0 z-50 px-5 py-4 flex items-center justify-between">
          <button
            onClick={() => {
              haptic.light();
              setSelectedTech(null);
            }}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-cyan-500 active:scale-90 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 overflow-hidden">
              <Avatar className="size-full">
                <AvatarImage src={selected.avatar} />
                <AvatarFallback>{selected.model_name[0]}</AvatarFallback>
              </Avatar>
            </div>
            <span className="text-[16px] font-black tracking-tight">
              {selected.model_name}
            </span>
          </div>
          <div className="px-3 py-1 rounded-full bg-cyan-900/10 border border-cyan-500/20 text-[13px] font-black text-cyan-500">
            ◈ {cost}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col gap-10">
          {selected.versions && selected.versions.length > 1 && (
            <div className="flex flex-col gap-4">
              <h3 className="text-[13px] font-black uppercase tracking-widest text-white/30 px-2">
                {t('version')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {selected.versions.map((v) => (
                  <button
                    key={v.label}
                    onClick={() => {
                      haptic.selection();
                      setSelectedVersion(v.label);
                    }}
                    className={cn(
                      'px-5 py-2.5 rounded-full text-[14px] font-black transition-all',
                      currentVersion === v.label
                        ? 'bg-cyan-900/10 border border-cyan-500/20 text-[13px] font-black text-cyan-500 shadow-[0_0_20px_rgba(0,122,255,0.3)]'
                        : 'bg-white/5 text-white/40 border border-white/5'
                    )}
                  >
                    {v.label}{' '}
                    <span className="opacity-40 ml-1">◈ {v.cost}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isTextModel && (
            <div className="flex flex-col gap-4">
              <h3 className="text-[13px] font-black uppercase tracking-widest text-white/30 px-2">
                {t('prompt')}
              </h3>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t('placeholder')}
                className="w-full h-40 bg-zinc-900/40 border border-white/5 rounded-[32px] p-6 text-[17px] font-medium placeholder:text-white/20 outline-none focus:border-cyan-500/30 transition-all resize-none"
              />
            </div>
          )}

          {aspectParam && (
            <div className="flex flex-col gap-4">
              <h3 className="text-[13px] font-black uppercase tracking-widest text-white/30 px-2">
                {t('aspectRatio')}
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {aspectParam.values?.map((val: string) => (
                  <button
                    key={val}
                    onClick={() =>
                      setExtraParams((p) => ({ ...p, aspect_ratio: val }))
                    }
                    className={cn(
                      'py-3 rounded-2xl font-black text-[13px] transition-all border',
                      (extraParams.aspect_ratio ?? aspectParam.default) === val
                        ? 'bg-white text-black border-white'
                        : 'bg-zinc-900/60 text-white/30 border-white/5'
                    )}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Остальные параметры модели (всё, кроме aspect_ratio, который отрисован выше) */}
          {(params || [])
            .filter((p: any) => p.name !== 'aspect_ratio')
            .map((p: any) => {
              const label = getParamLabel(p.name, locale);
              const values: any[] = Array.isArray(p.values) ? p.values : [];
              const current = extraParams[p.name] ?? p.default;

              // 1. Перечисление значений — чипсы
              if (values.length > 0) {
                return (
                  <div key={p.name} className="flex flex-col gap-4">
                    <h3 className="text-[13px] font-black uppercase tracking-widest text-white/30 px-2">
                      {label}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {values.map((val: any) => {
                        const v = String(val);
                        const active = String(current) === v;
                        return (
                          <button
                            key={v}
                            onClick={() => {
                              haptic.selection();
                              setExtraParams((prev) => ({ ...prev, [p.name]: val }));
                            }}
                            className={cn(
                              'px-4 py-2.5 rounded-full text-[13px] font-black border transition-all',
                              active
                                ? 'bg-white text-black border-white'
                                : 'bg-zinc-900/60 text-white/40 border-white/5'
                            )}
                          >
                            {getParamValueLabel(p.name, v, locale)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // 2. Булево — переключатель
              if (typeof p.default === 'boolean' || p.type === 'boolean') {
                const on = current === true || current === 'true';
                return (
                  <div
                    key={p.name}
                    className="flex items-center justify-between gap-4 px-2"
                  >
                    <h3 className="text-[13px] font-black uppercase tracking-widest text-white/30">
                      {label}
                    </h3>
                    <button
                      onClick={() => {
                        haptic.selection();
                        setExtraParams((prev) => ({ ...prev, [p.name]: !on }));
                      }}
                      className={cn(
                        'relative w-12 h-7 rounded-full transition-colors shrink-0',
                        on ? 'bg-cyan-500' : 'bg-white/10'
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-1 size-5 rounded-full bg-white transition-all',
                          on ? 'left-6' : 'left-1'
                        )}
                      />
                    </button>
                  </div>
                );
              }

              // 3. Число / строка — инпут
              const isNumber =
                typeof p.default === 'number' || p.type === 'number';
              return (
                <div key={p.name} className="flex flex-col gap-4">
                  <h3 className="text-[13px] font-black uppercase tracking-widest text-white/30 px-2">
                    {label}
                  </h3>
                  <input
                    type={isNumber ? 'number' : 'text'}
                    value={current ?? ''}
                    onChange={(e) =>
                      setExtraParams((prev) => ({
                        ...prev,
                        [p.name]: isNumber
                          ? e.target.value === ''
                            ? ''
                            : Number(e.target.value)
                          : e.target.value,
                      }))
                    }
                    className="w-full bg-zinc-900/40 border border-white/5 rounded-2xl p-4 text-[15px] font-medium placeholder:text-white/20 outline-none focus:border-cyan-500/30 transition-all"
                  />
                </div>
              );
            })}

          {canAttach && !isTextModel && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center px-2">
                <h3 className="text-[13px] font-black uppercase tracking-widest text-white/30">
                  {t('media')}
                </h3>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[13px] font-black text-cyan-500 flex items-center gap-1.5"
                >
                  <ImagePlus size={14} /> {t('attach')}
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {media.map((m, i) => (
                  <div
                    key={i}
                    className="relative w-20 h-20 rounded-2xl overflow-hidden border border-white/10 group shadow-xl"
                  >
                    {m.type === 'image' ? (
                      <img
                        src={m.file ? URL.createObjectURL(m.file) : m.url}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="size-full bg-zinc-800 flex items-center justify-center text-2xl">
                        {m.type === 'video' ? '🎬' : '🎵'}
                      </div>
                    )}
                    <button
                      onClick={() =>
                        setMedia((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white border border-white/20"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {media.length === 0 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-2xl bg-zinc-900 border-2 border-dashed border-white/10 flex items-center justify-center text-white/20 hover:text-cyan-500 hover:border-cyan-500/30 transition-all"
                  >
                    <ImagePlus size={24} />
                  </button>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*,.heic,video/*,audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={
              generate.isPending ||
              upload.isPending ||
              (!isTextModel && !prompt.trim() && media.length === 0)
            }
            className={cn(
              'w-full h-16 rounded-[24px] flex items-center justify-center gap-3 font-black text-[17px] transition-all active:scale-[0.98] shadow-2xl',
              generate.isPending
                ? 'bg-white/5 text-white/20'
                : 'bg-cyan-900/10 border border-cyan-500/20 text-[13px] font-black text-cyan-500'
            )}
          >
            {generate.isPending ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Sparkles size={20} fill="currentColor" />
            )}
            {generate.isPending ? t('generating') : t('generate')}
          </button>
        </div>
      </div>
    );
  }

  const SEGMENTS: { key: ModelKind | 'roles'; label: string; icon: typeof Zap }[] =
    [
      { key: 'text', label: t('segChat'), icon: MessageSquare },
      { key: 'image', label: t('segImage'), icon: ImageIcon },
      { key: 'video', label: t('segVideo'), icon: Film },
      { key: 'audio', label: t('segAudio'), icon: Music },
      { key: 'roles', label: t('segRoles'), icon: Drama },
    ];

  const q = search.trim().toLowerCase();
  const segModels =
    segment === 'roles'
      ? []
      : models.filter((m) => getModelKind(m) === segment);
  const visibleModels = segModels.filter((m) => {
    if (favOnly && !favorites.includes(m.tech_name)) return false;
    if (q && !m.model_name.toLowerCase().includes(q)) return false;
    return true;
  });
  const visibleRoles = (roles || []).filter((r) => {
    if (favOnly && !favorites.includes(`role:${r.id}`)) return false;
    if (q && !localize(r.label, locale).toLowerCase().includes(q)) return false;
    return true;
  });

  const showEmpty =
    !isLoading &&
    (segment === 'roles'
      ? visibleRoles.length === 0
      : visibleModels.length === 0);

  return (
    <div className="flex flex-col min-h-svh pb-32 max-w-2xl mx-auto w-full">
      {/* Header */}
      <header className="px-5 pt-12 pb-2">
        <h1 className="text-[32px] font-black tracking-tight text-white leading-none mb-1.5">
          {t('title')}
        </h1>
        <p className="text-white/35 text-[15px] font-medium">{t('subtitle')}</p>
      </header>

      {/* Search */}
      <div className="px-5 pt-4">
        <div className="relative">
          <Search
            size={17}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full h-12 pl-11 pr-4 rounded-2xl bg-zinc-900/60 border border-white/10 text-[15px] text-white placeholder:text-white/25 outline-none focus:border-cyan-500/40 transition-colors"
          />
        </div>
      </div>

      {/* Segmented control */}
      <div
        ref={segScrollRef}
        className="px-5 pt-4 flex items-center gap-2 overflow-x-auto select-none cursor-grab active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
      >
        {SEGMENTS.map((s) => {
          const Icon = s.icon;
          const active = segment === s.key;
          return (
            <button
              key={s.key}
              onClick={() => {
                haptic.selection();
                setSegment(s.key);
              }}
              className={cn(
                'flex items-center gap-1.5 h-10 px-4 rounded-full text-[14px] font-black whitespace-nowrap transition-all active:scale-95 border',
                active
                  ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.35)]'
                  : 'bg-white/5 text-white/45 border-white/10'
              )}
            >
              <Icon size={15} />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Favorites filter */}
      <div className="px-5 pt-3">
        <button
          onClick={() => {
            haptic.selection();
            setFavOnly((v) => !v);
          }}
          className={cn(
            'inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-bold transition-all active:scale-95 border',
            favOnly
              ? 'bg-amber-400/15 text-amber-300 border-amber-400/30'
              : 'bg-white/5 text-white/40 border-white/10'
          )}
        >
          <Star
            size={13}
            className={favOnly ? 'fill-amber-300 text-amber-300' : ''}
          />
          {t('favoritesOnly')}
        </button>
      </div>

      {/* Content */}
      <div className="px-5 pt-5">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded-3xl bg-zinc-900 animate-pulse"
              />
            ))}
          </div>
        ) : showEmpty ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Search size={26} className="text-white/30" />
            </div>
            <p className="text-white/40 font-medium">{t('noResults')}</p>
          </div>
        ) : segment === 'roles' ? (
          <div className="grid grid-cols-2 gap-3">
            {visibleRoles.map((r) => {
              const favId = `role:${r.id}`;
              const isFav = favorites.includes(favId);
              const label = localize(r.label, locale);
              const desc = localize(r.description, locale);
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    haptic.light();
                    router.push(`/chats/new?role=${r.id}`);
                  }}
                  className="group relative flex flex-col text-left rounded-3xl overflow-hidden border border-white/10 bg-zinc-900/40 active:scale-[0.98] transition-all"
                >
                  <div className="relative aspect-square w-full">
                    <SmartImage
                      src={r.image}
                      alt={label}
                      className="absolute inset-0 w-full h-full"
                      ctx={{ surface: 'roles', roleId: r.id }}
                    />
                    <FavStar
                      active={isFav}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFav(favId);
                      }}
                    />
                  </div>
                  <div className="p-3 flex flex-col gap-1.5 flex-1">
                    <p className="text-[15px] font-black text-white leading-tight truncate">
                      {label}
                    </p>
                    {desc && (
                      <p className="text-[12px] font-medium text-white/40 leading-snug line-clamp-2">
                        {desc}
                      </p>
                    )}
                    <span className="mt-auto pt-1 text-[12px] font-black text-cyan-400">
                      {t('roleCta')} →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {visibleModels.map((m) => {
              const meta = describeModel(m, locale);
              const isFav = favorites.includes(m.tech_name);
              return (
                <button
                  key={m.tech_name}
                  onClick={() => {
                    haptic.light();
                    setSelectedTech(m.tech_name);
                  }}
                  className="group relative flex flex-col text-left rounded-3xl overflow-hidden border border-white/10 bg-zinc-900/40 hover:border-white/20 active:scale-[0.98] transition-all"
                >
                  <div className="relative aspect-square w-full">
                    <SmartImage
                      src={m.avatar}
                      alt={m.model_name}
                      className="absolute inset-0 w-full h-full"
                      ctx={{ surface: 'models', tech: m.tech_name }}
                    />
                    <FavStar
                      active={isFav}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFav(m.tech_name);
                      }}
                    />
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/55 backdrop-blur border border-white/10 text-[11px] font-black text-white">
                      ◈ {meta.cost}
                    </div>
                  </div>
                  <div className="p-3 flex flex-col gap-1.5 flex-1">
                    <p className="text-[15px] font-black text-white leading-tight truncate">
                      {m.model_name}
                    </p>
                    <p className="text-[12px] font-medium text-white/40 leading-snug line-clamp-2">
                      {meta.description}
                    </p>
                    {meta.inputs.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {meta.inputs.map((inp) => (
                          <span
                            key={inp}
                            className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-white/50"
                          >
                            {inp}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Звезда «избранное» — общий оверлей для карточек моделей и ролей.
function FavStar({
  active,
  onClick,
}: {
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <span
      role="button"
      onClick={onClick}
      className={cn(
        'absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur border transition-all active:scale-90',
        active
          ? 'bg-amber-400/90 border-amber-300'
          : 'bg-black/45 border-white/15'
      )}
    >
      <Star
        size={15}
        className={active ? 'fill-black text-black' : 'text-white'}
      />
    </span>
  );
}

export default Generate;
