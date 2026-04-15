'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAIModels, useModelParams } from '@/hooks/useModels';
import { convertMediaToInputs, useGenerateAI } from '@/hooks/useGenerations';
import { useUpload } from '@/hooks/useApiExtras';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Loader2,
  ChevronLeft,
  ImagePlus,
  X,
  CheckCircle,
  AlertCircle,
  Settings2,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useHaptic } from '@/hooks/useHaptic';
import { cn } from '@/lib/utils';

/* ── Polling ── */
function useGenerationStatus(dialogueId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['gen-status', dialogueId],
    queryFn: async () => {
      const { data } = await api.get('/api/history', {
        // ← ФИКС ПУТИ
        params: { dialogue_id: dialogueId },
      });
      const msgs = data.messages || data || [];
      return Array.isArray(msgs) ? msgs[msgs.length - 1] : null;
    },
    enabled: !!dialogueId && enabled,
    refetchInterval: 2000,
  });
}
/* ── Shared classes ── */
const glassThin = cn(
  'bg-white/[.07] dark:bg-black/[.45] backdrop-blur-xl backdrop-saturate-150',
  'border border-white/[.14]',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
);
const glassRegular = cn(
  'bg-white/[.10] dark:bg-black/[.55] backdrop-blur-2xl backdrop-saturate-180',
  'border border-white/[.18]',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.20),0_4px_16px_rgba(0,0,0,0.22)]'
);
const glassThick = cn(
  'bg-white/[.13] dark:bg-black/[.65] backdrop-blur-3xl backdrop-saturate-200',
  'border border-white/[.22]',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_32px_rgba(0,0,0,0.28)]'
);
const glassBlue = cn(
  'bg-[rgba(0,122,255,0.85)] backdrop-blur-xl',
  'border border-[rgba(0,122,255,0.30)]',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_24px_rgba(0,122,255,0.38)]'
);
const spring =
  'transition-all duration-[280ms] [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]';

/* ── Section label ── */
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] font-bold tracking-[0.6px] uppercase text-white/50 mb-2.5">
    {children}
  </p>
);

/* ── Pill button ── */
const PillBtn = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => {
  const haptic = useHaptic();
  return (
    <button
      onClick={() => {
        haptic.selection();
        onClick();
      }}
      className={cn(
        'px-[14px] py-1.5 rounded-full text-[13px] font-semibold cursor-pointer flex-shrink-0',
        spring,
        'active:scale-[0.92]',
        active ? glassBlue + ' text-white' : glassThin + ' text-white/50'
      )}
    >
      {children}
    </button>
  );
};

/* ── Model row ── */
const ModelRow = ({ m, onClick }: { m: any; onClick: () => void }) => {
  const haptic = useHaptic();
  const cost =
    m.versions?.find((v: any) => v.default)?.cost ?? m.versions?.[0]?.cost ?? 1;
  const avatarUrl =
    m.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(m.model_name)}&background=1c1c1c&color=fff&size=128`;

  return (
    <button
      onClick={() => {
        haptic.light();
        onClick();
      }}
      className={cn(
        'flex items-center gap-[14px] px-5 py-[13px] w-full text-left',
        'bg-transparent border-none border-b border-white/[.06] cursor-pointer',
        spring,
        'hover:bg-white/[.04] active:bg-white/[.07] active:scale-[0.985]'
      )}
    >
      <div className="w-[46px] h-[46px] rounded-[14px] overflow-hidden flex-shrink-0 border border-white/[.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
        <Avatar className="size-full">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="text-[12px] font-bold bg-white/[.10] text-white">
            {m.model_name.slice(0, 2)}
          </AvatarFallback>
        </Avatar>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-white truncate tracking-[-0.2px]">
          {m.model_name}
        </p>
        <p className="text-[12px] text-white/50 mt-0.5">
          {m.versions?.length > 1
            ? `${m.versions.length} версии`
            : m.versions?.[0]?.label || ''}
        </p>
      </div>
      <div
        className={cn(
          'inline-flex items-center gap-1 px-[10px] py-[3px] rounded-full text-[12px] font-semibold text-white/50 flex-shrink-0',
          glassThin
        )}
      >
        💎 {cost}
      </div>
    </button>
  );
};

/* ── Main ── */
export const Generate = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modelParam = searchParams.get('model');
  const haptic = useHaptic();
  const queryClient = useQueryClient();

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

  const models = (allModels || []).filter(
    (m) => !m.categories?.includes('text')
  );
  const selected = models.find((m) => m.tech_name === selectedTech);
  const currentVersion =
    selectedVersion ||
    selected?.versions?.find((v) => v.default)?.label ||
    selected?.versions?.[0]?.label;

  const { data: params } = useModelParams(selectedTech, currentVersion);
  const { data: lastMessage } = useGenerationStatus(pendingId, isWaiting);

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
  useEffect(() => {
    if (!isWaiting || !lastMessage) return;
    if (lastMessage.status === 'completed') {
      haptic.success();
      setIsWaiting(false);
      toast.success('Генерация завершена!');
      if (pendingId) router.push(`/chats/${pendingId}`);
      setPendingId(null);
    } else if (lastMessage.status === 'error') {
      haptic.error();
      setIsWaiting(false);
      toast.error('Ошибка: ' + (lastMessage.error || 'Неизвестная ошибка'));
      setPendingId(null);
    }
  }, [lastMessage, isWaiting, pendingId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const file = files[0];
    try {
      const uploaded = await upload.mutateAsync(file);
      setMedia((prev) => [
        ...prev,
        { type: uploaded.type, url: uploaded.url, file },
      ]);
    } catch {
      toast.error('Ошибка загрузки файла');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerate = () => {
    if (!selected) return;
    if (!prompt.trim() && media.length === 0) {
      toast.error('Введите описание или прикрепите файл');
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

          // ── КЕШИРУЕМ МОДЕЛЬ чтобы страница чата сразу её знала ──
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
            toast('Генерация запущена, ждём результата...');
            setPendingId(dialogueId || null);
            setIsWaiting(!!dialogueId);
          } else if (dialogueId) {
            haptic.success();
            toast.success('Готово!');
            // ── СРАЗУ В ЧАТ ──
            router.push(`/chats/${dialogueId}`);
          } else {
            toast.success('Генерация завершена');
          }
        },
      }
    );
  };

  // 3. В useEffect где отслеживаем lastMessage (isWaiting) — тоже кешируем и кидаем в чат:
  useEffect(() => {
    if (!isWaiting || !lastMessage) return;
    if (lastMessage.status === 'completed') {
      haptic.success();
      setIsWaiting(false);
      toast.success('Генерация завершена!');
      if (pendingId) {
        // Модель уже закешировна в handleGenerate выше
        router.push(`/chats/${pendingId}`);
      }
      setPendingId(null);
    } else if (lastMessage.status === 'error') {
      haptic.error();
      setIsWaiting(false);
      toast.error('Ошибка: ' + (lastMessage.error || 'Неизвестная ошибка'));
      setPendingId(null);
    }
  }, [lastMessage, isWaiting, pendingId]);

  /* ── Waiting screen ── */
  if (isWaiting && pendingId) {
    const status = lastMessage?.status;
    return (
      <div className="flex flex-col items-center justify-center min-h-[100svh] gap-7 px-5 text-center">
        <div
          className={cn(
            'w-20 h-20 rounded-[28px] flex items-center justify-center',
            glassThick
          )}
        >
          {!status || status === 'processing' ? (
            <Loader2 size={32} className="animate-spin text-white/50" />
          ) : status === 'completed' ? (
            <CheckCircle size={32} className="text-[#34C759]" />
          ) : (
            <AlertCircle size={32} className="text-[#FF3B30]" />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-[20px] font-bold tracking-[-0.4px]">
            {!status || status === 'processing'
              ? 'Генерация...'
              : status === 'completed'
                ? 'Готово!'
                : 'Ошибка'}
          </p>
          <p className="text-[14px] text-white/50 max-w-[280px] leading-[1.5]">
            {!status || status === 'processing'
              ? 'Нейросеть обрабатывает запрос. Это может занять от нескольких секунд до минуты.'
              : 'Переход к результату...'}
          </p>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{ animationDelay: `${i * 0.2}s` }}
              className="w-1.5 h-1.5 rounded-full bg-white/30 animate-[pulse-dot_1.4s_ease-in-out_infinite]"
            />
          ))}
        </div>
        <button
          onClick={() => {
            setIsWaiting(false);
            setPendingId(null);
            router.push(`/chats/${pendingId}`);
          }}
          className="text-[13px] text-white/50 bg-none border-none cursor-pointer underline underline-offset-4"
        >
          Перейти в чат
        </button>
        <style>{`@keyframes pulse-dot{0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1}}`}</style>
      </div>
    );
  }

  /* ── Detail view ── */
  if (selected) {
    const cost =
      selected.versions?.find((v) => v.label === currentVersion)?.cost ??
      selected.versions?.[0]?.cost ??
      1;
    const canAttach = selected.input?.some((t) =>
      ['image', 'video', 'audio'].includes(t)
    );
    const aspectParam = (params || []).find(
      (p: any) => p.name === 'aspect_ratio'
    );

    return (
      <div className="flex flex-col min-h-[100svh] pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))] overflow-x-hidden">
        {/* Header */}
        <header
          className={cn(
            'sticky top-0 z-40',
            'bg-white/[.04] dark:bg-black/[.35] backdrop-blur-2xl backdrop-saturate-150',
            'border-b border-white/[.10]',
            'shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
          )}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => {
                haptic.light();
                setSelectedTech(null);
                setPrompt('');
                setMedia([]);
                setExtraParams({});
                setShowParams(false);
              }}
              className={cn(
                'flex items-center gap-1 text-[15px] font-medium text-[#0A84FF] bg-none border-none cursor-pointer px-2 py-1 rounded-lg',
                spring,
                'active:scale-[0.92]'
              )}
            >
              <ChevronLeft size={18} /> Назад
            </button>

            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-[26px] h-[26px] rounded-lg overflow-hidden',
                  glassThin
                )}
              >
                <Avatar className="size-full">
                  <AvatarImage src={selected.avatar} />
                  <AvatarFallback className="text-[9px] font-bold">
                    {selected.model_name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <span className="text-[15px] font-semibold tracking-[-0.2px]">
                {selected.model_name}
              </span>
            </div>

            <div
              className={cn(
                'inline-flex items-center gap-1 px-[10px] py-1 rounded-full text-[12px] font-semibold text-white/50',
                glassThin
              )}
            >
              💎 {cost}
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[760px] mx-auto flex flex-col gap-5 px-5 py-5">
            {/* Versions */}
            {selected.versions && selected.versions.length > 1 && (
              <div>
                <SectionLabel>Версия</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {selected.versions.map((v) => (
                    <PillBtn
                      key={v.label}
                      active={currentVersion === v.label}
                      onClick={() => setSelectedVersion(v.label)}
                    >
                      {v.label} <span className="opacity-60">· {v.cost}💎</span>
                    </PillBtn>
                  ))}
                </div>
              </div>
            )}

            {/* Prompt */}
            <div>
              <SectionLabel>Описание</SectionLabel>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Опишите, что хотите создать..."
                rows={4}
                className={cn(
                  'w-full resize-none outline-none px-4 py-[14px] rounded-2xl',
                  glassRegular,
                  'text-[15px] leading-[1.55] text-white placeholder:text-white/30',
                  'box-border font-[var(--font-sf)]',
                  spring,
                  'focus:border-[rgba(0,122,255,0.40)] focus:shadow-[inset_0_1px_0_rgba(255,255,255,0.20),0_0_0_3px_rgba(0,122,255,0.12)]'
                )}
              />
            </div>

            {/* Aspect ratio */}
            {aspectParam && (
              <div>
                <SectionLabel>Соотношение сторон</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {aspectParam.values?.map((val: string) => (
                    <PillBtn
                      key={val}
                      active={
                        (extraParams.aspect_ratio ?? aspectParam.default) ===
                        val
                      }
                      onClick={() =>
                        setExtraParams((p) => ({ ...p, aspect_ratio: val }))
                      }
                    >
                      {val}
                    </PillBtn>
                  ))}
                </div>
              </div>
            )}

            {/* Advanced params */}
            {params &&
              params.filter((p: any) => p.name !== 'aspect_ratio').length >
                0 && (
                <div>
                  <button
                    onClick={() => {
                      haptic.selection();
                      setShowParams(!showParams);
                    }}
                    className="flex items-center gap-1.5 text-[13px] text-white/50 bg-none border-none cursor-pointer py-1.5"
                  >
                    <Settings2 size={14} />
                    Дополнительные параметры
                    <ChevronDown
                      size={14}
                      className={cn(
                        'transition-transform duration-[280ms]',
                        showParams && 'rotate-180'
                      )}
                    />
                  </button>
                  {showParams && (
                    <div className="mt-[14px] flex flex-col gap-[14px]">
                      {params
                        .filter((p: any) => p.name !== 'aspect_ratio')
                        .map((p: any) => (
                          <div key={p.name}>
                            <label className="block text-[12px] text-white/50 mb-1.5">
                              {p.label || p.name}
                            </label>
                            {p.type === 'select' && p.values ? (
                              <div className="flex flex-wrap gap-1.5">
                                {p.values.map((val: string) => (
                                  <PillBtn
                                    key={val}
                                    active={
                                      (extraParams[p.name] ?? p.default) === val
                                    }
                                    onClick={() =>
                                      setExtraParams((prev) => ({
                                        ...prev,
                                        [p.name]: val,
                                      }))
                                    }
                                  >
                                    {val}
                                  </PillBtn>
                                ))}
                              </div>
                            ) : (
                              <input
                                type={p.type === 'number' ? 'number' : 'text'}
                                value={extraParams[p.name] ?? p.default ?? ''}
                                min={p.min}
                                max={p.max}
                                onChange={(e) =>
                                  setExtraParams((prev) => ({
                                    ...prev,
                                    [p.name]:
                                      p.type === 'number'
                                        ? Number(e.target.value)
                                        : e.target.value,
                                  }))
                                }
                                className={cn(
                                  'w-full box-border px-[14px] py-[10px] rounded-xl text-[14px] outline-none text-white',
                                  glassThin
                                )}
                              />
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

            {/* Media */}
            {canAttach && (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <SectionLabel>Медиафайл</SectionLabel>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={upload.isPending}
                    className={cn(
                      'flex items-center gap-1.5 text-[13px] font-semibold text-[#0A84FF] bg-none border-none cursor-pointer',
                      spring,
                      upload.isPending && 'opacity-50'
                    )}
                  >
                    {upload.isPending ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <ImagePlus size={13} />
                    )}
                    Прикрепить
                  </button>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,.heic,video/*,audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {media.length > 0 && (
                  <div className="flex gap-2.5 flex-wrap">
                    {media.map((m, i) => (
                      <div
                        key={i}
                        className="relative w-20 h-20 rounded-2xl overflow-hidden border border-white/[.14]"
                      >
                        {m.type === 'image' ? (
                          <img
                            src={m.file ? URL.createObjectURL(m.file) : m.url}
                            className="w-full h-full object-cover"
                            alt=""
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = m.url;
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[28px] bg-white/[.07]">
                            {m.type === 'video' ? '🎬' : '🎵'}
                          </div>
                        )}
                        <button
                          onClick={() =>
                            setMedia((prev) =>
                              prev.filter((_, idx) => idx !== i)
                            )
                          }
                          className="absolute top-[5px] right-[5px] w-5 h-5 bg-black/55 backdrop-blur-lg rounded-full flex items-center justify-center text-white border-none cursor-pointer"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={
                (!prompt.trim() && media.length === 0) ||
                generate.isPending ||
                upload.isPending
              }
              className={cn(
                'w-full py-4 px-6 rounded-full text-[17px] font-bold text-white',
                'flex items-center justify-center gap-2',
                glassBlue,
                spring,
                'active:scale-[0.97]',
                ((!prompt.trim() && media.length === 0) ||
                  generate.isPending ||
                  upload.isPending) &&
                  'opacity-45'
              )}
            >
              {generate.isPending || upload.isPending ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {upload.isPending ? 'Загрузка...' : 'Генерация...'}
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Создать
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Model picker ── */
  const catOrder = ['image', 'video', 'audio'] as const;
  const catLabel: Record<string, string> = {
    image: '🖼️ Изображения',
    video: '🎬 Видео',
    audio: '🎵 Аудио',
  };

  return (
    <div className="flex flex-col min-h-[100svh] pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))] overflow-x-hidden">
      <header
        className={cn(
          'sticky top-0 z-40 px-5 py-[14px]',
          'bg-white/[.04] dark:bg-black/[.35] backdrop-blur-2xl backdrop-saturate-150',
          'border-b border-white/[.10]',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
        )}
      >
        <div className="max-w-[760px] mx-auto">
          <p className="text-[22px] font-bold tracking-[-0.5px]">Создать</p>
          <p className="text-[13px] text-white/50 mt-0.5">Выберите нейросеть</p>
        </div>
      </header>

      <div className="flex-1">
        <div className="max-w-[760px] mx-auto">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-[14px] px-5 py-[13px] border-b border-white/[.06]"
                >
                  <div
                    className={cn(
                      'w-[46px] h-[46px] rounded-[14px] flex-shrink-0 animate-[pulse-opacity_1.6s_ease-in-out_infinite]',
                      glassThin
                    )}
                  />
                  <div className="flex-1">
                    <div
                      className={cn(
                        'w-[40%] h-[13px] rounded-md mb-1.5 animate-[pulse-opacity_1.6s_ease-in-out_0.1s_infinite]',
                        glassThin
                      )}
                    />
                    <div
                      className={cn(
                        'w-[25%] h-[10px] rounded-md animate-[pulse-opacity_1.6s_ease-in-out_0.2s_infinite]',
                        glassThin
                      )}
                    />
                  </div>
                </div>
              ))
            : catOrder.map((cat) => {
                const catModels = models.filter(
                  (m) => m.mainCategory === cat || m.categories?.includes(cat)
                );
                if (!catModels.length) return null;
                return (
                  <div key={cat}>
                    <div className="px-5 py-[10px] bg-white/[.04] backdrop-blur-xl border-b border-white/[.06]">
                      <p className="text-[11px] font-bold tracking-[0.6px] uppercase text-white/50">
                        {catLabel[cat]}
                      </p>
                    </div>
                    {catModels.map((m) => (
                      <ModelRow
                        key={m.tech_name}
                        m={m}
                        onClick={() => setSelectedTech(m.tech_name)}
                      />
                    ))}
                  </div>
                );
              })}
        </div>
      </div>

      <style>{`@keyframes pulse-opacity{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
};

export default Generate;
