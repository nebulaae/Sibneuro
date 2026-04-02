'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAIModels, useModelParams } from '@/hooks/useModels';
import { useGenerateAI, convertMediaToInputs } from '@/hooks/useGenerations';
import { useUpload, useGenerationStatus } from '@/hooks/useApiExtras';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ModelsLoader } from '@/components/states/Loading';
import {
  ChevronLeft,
  ChevronDown,
  ImagePlus,
  Loader2,
  X,
  Settings2,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export const Generate = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modelParam = searchParams.get('model');

  const [selectedTech, setSelectedTech] = useState<string | null>(modelParam);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [media, setMedia] = useState<
    { type: string; url: string; file?: File }[]
  >([]);
  const [extraParams, setExtraParams] = useState<Record<string, any>>({});
  const [showParams, setShowParams] = useState(false);

  // Состояние для async-генерации: ждём результата
  const [pendingDialogueId, setPendingDialogueId] = useState<string | null>(
    null
  );
  const [isWaitingResult, setIsWaitingResult] = useState(false);

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

  // Polling последнего сообщения пока ждём результат async-генерации
  const { data: lastMessage } = useGenerationStatus(
    pendingDialogueId,
    isWaitingResult
  );

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

  // Следим за результатом async-генерации
  useEffect(() => {
    if (!isWaitingResult || !lastMessage) return;

    if (lastMessage.status === 'completed') {
      setIsWaitingResult(false);
      toast.success('Генерация завершена!');
      if (pendingDialogueId) router.push(`/chats/${pendingDialogueId}`);
      setPendingDialogueId(null);
    } else if (lastMessage.status === 'error') {
      setIsWaitingResult(false);
      toast.error(
        'Ошибка генерации: ' + (lastMessage.error || 'Неизвестная ошибка')
      );
      setPendingDialogueId(null);
    }
  }, [lastMessage, isWaitingResult, pendingDialogueId, router]);

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

  const removeMedia = (i: number) =>
    setMedia((prev) => prev.filter((_, idx) => idx !== i));

  const handleGenerate = () => {
    if (!selected) return;
    if (!prompt.trim() && media.length === 0) {
      toast.error('Введите описание или прикрепите файл');
      return;
    }

    const oldFormatMedia = media.map((m) => ({
      type: m.type,
      format: 'url',
      input: m.url,
    }));
    const inputs = convertMediaToInputs(prompt || null, oldFormatMedia);

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

          if (data.status === 'processing') {
            // АСИНХРОННАЯ генерация — запускаем polling
            toast('Генерация запущена, ждём результата...');
            setPendingDialogueId(dialogueId || null);
            setIsWaitingResult(!!dialogueId);
            if (!dialogueId) {
              toast.error(
                'Не удалось получить ID диалога для отслеживания результата'
              );
            }
          } else if (dialogueId) {
            // СИНХРОННЫЙ результат — сразу переходим
            toast.success('Готово!');
            router.push(`/chats/${dialogueId}`);
          } else {
            toast.success('Генерация завершена');
          }
        },
      }
    );
  };

  // --- Экран ожидания async-генерации ---
  if (isWaitingResult && pendingDialogueId) {
    const status = lastMessage?.status;
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-6 px-6 text-center">
        <div className="relative size-20 rounded-3xl bg-secondary/60 flex items-center justify-center">
          {!status || status === 'processing' ? (
            <Loader2 className="size-9 animate-spin text-muted-foreground" />
          ) : status === 'completed' ? (
            <CheckCircle className="size-9 text-emerald-500" />
          ) : (
            <AlertCircle className="size-9 text-red-500" />
          )}
        </div>

        <div className="space-y-2">
          <p className="text-lg font-semibold">
            {!status || status === 'processing'
              ? 'Генерация...'
              : status === 'completed'
                ? 'Готово!'
                : 'Ошибка'}
          </p>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            {!status || status === 'processing'
              ? 'Нейросеть обрабатывает запрос. Это может занять от нескольких секунд до минуты.'
              : 'Переход к результату...'}
          </p>
        </div>

        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="size-1.5 rounded-full bg-muted-foreground/40 animate-pulse"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>

        <button
          onClick={() => {
            setIsWaitingResult(false);
            setPendingDialogueId(null);
            router.push(`/chats/${pendingDialogueId}`);
          }}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
        >
          Перейти в чат
        </button>
      </div>
    );
  }

  // --- Detail view (выбрана модель) ---
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
      <div className="flex flex-col h-full pb-24">
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-background/85 backdrop-blur-xl border-b border-border/50">
          <button
            onClick={() => {
              setSelectedTech(null);
              setPrompt('');
              setMedia([]);
              setExtraParams({});
              setShowParams(false);
            }}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="size-4" /> Назад
          </button>
          <div className="flex items-center gap-2">
            <Avatar className="size-6 rounded-lg">
              <AvatarImage src={selected.avatar} />
              <AvatarFallback className="rounded-lg bg-secondary text-[10px] font-bold">
                {selected.model_name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span className="font-semibold text-sm">{selected.model_name}</span>
          </div>
          <Badge variant="secondary" className="gap-1 text-xs">
            <svg
              width="9"
              height="9"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="opacity-60"
            >
              <path d="M12 2L2 9l10 13 10-13L12 2zm0 3.5L18.5 9 12 18.5 5.5 9 12 5.5z" />
            </svg>
            {cost}
          </Badge>
        </div>

        <div className="flex flex-col gap-4 p-4 overflow-y-auto">
          {/* Version selector */}
          {selected.versions && selected.versions.length > 1 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Версия
              </p>
              <div className="flex flex-wrap gap-2">
                {selected.versions.map((v) => (
                  <button
                    key={v.label}
                    onClick={() => setSelectedVersion(v.label)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${currentVersion === v.label ? 'bg-foreground text-background border-foreground' : 'bg-secondary text-muted-foreground border-border'}`}
                  >
                    {v.label}
                    <span className="ml-1 opacity-60">·{v.cost}💎</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Prompt */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Описание
            </p>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Опишите, что хотите создать..."
              className="resize-none min-h-28 bg-secondary/50 border-border/50 text-sm"
            />
          </div>

          {/* Aspect ratio */}
          {aspectParam && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Соотношение сторон
              </p>
              <div className="flex flex-wrap gap-2">
                {aspectParam.values?.map((val: string) => (
                  <button
                    key={val}
                    onClick={() =>
                      setExtraParams((p) => ({ ...p, aspect_ratio: val }))
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${(extraParams.aspect_ratio ?? aspectParam.default) === val ? 'bg-foreground text-background border-foreground' : 'bg-secondary text-muted-foreground border-border'}`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Advanced params */}
          {params &&
            params.filter((p: any) => p.name !== 'aspect_ratio').length > 0 && (
              <div>
                <button
                  onClick={() => setShowParams(!showParams)}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Settings2 className="size-3.5" />
                  Дополнительные параметры
                  <ChevronDown
                    className={`size-3.5 transition-transform ${showParams ? 'rotate-180' : ''}`}
                  />
                </button>
                {showParams && (
                  <div className="mt-3 space-y-3">
                    {params
                      .filter((p: any) => p.name !== 'aspect_ratio')
                      .map((p: any) => (
                        <div key={p.name}>
                          <label className="text-xs text-muted-foreground mb-1 block">
                            {p.label || p.name}
                          </label>
                          {p.type === 'select' && p.values ? (
                            <div className="flex flex-wrap gap-1.5">
                              {p.values.map((val: string) => (
                                <button
                                  key={val}
                                  onClick={() =>
                                    setExtraParams((prev) => ({
                                      ...prev,
                                      [p.name]: val,
                                    }))
                                  }
                                  className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${(extraParams[p.name] ?? p.default) === val ? 'bg-foreground text-background border-foreground' : 'bg-secondary border-border text-muted-foreground'}`}
                                >
                                  {val}
                                </button>
                              ))}
                            </div>
                          ) : p.type === 'number' ? (
                            <input
                              type="number"
                              value={extraParams[p.name] ?? p.default ?? ''}
                              min={p.min}
                              max={p.max}
                              onChange={(e) =>
                                setExtraParams((prev) => ({
                                  ...prev,
                                  [p.name]: Number(e.target.value),
                                }))
                              }
                              className="w-full px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm"
                            />
                          ) : (
                            <input
                              type="text"
                              value={extraParams[p.name] ?? p.default ?? ''}
                              onChange={(e) =>
                                setExtraParams((prev) => ({
                                  ...prev,
                                  [p.name]: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm"
                            />
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

          {/* Media upload */}
          {canAttach && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Медиафайл
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={upload.isPending}
                  className="flex items-center gap-1.5 text-xs text-primary font-medium disabled:opacity-50"
                >
                  {upload.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <ImagePlus className="size-3.5" />
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
                <div className="flex gap-2 flex-wrap">
                  {media.map((m, i) => (
                    <div
                      key={i}
                      className="relative size-20 rounded-xl overflow-hidden border border-border/50"
                    >
                      {m.type === 'image' ? (
                        // ФИКС: используем загруженный URL вместо createObjectURL
                        // т.к. file может быть undefined для уже загруженных медиа
                        <img
                          src={m.file ? URL.createObjectURL(m.file) : m.url}
                          className="w-full h-full object-cover"
                          alt=""
                          onError={(e) => {
                            // Fallback на server URL если objectURL не работает
                            (e.target as HTMLImageElement).src = m.url;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-secondary flex items-center justify-center text-2xl">
                          {m.type === 'video' ? '🎬' : '🎵'}
                        </div>
                      )}
                      <button
                        onClick={() => removeMedia(i)}
                        className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 backdrop-blur-sm"
                      >
                        <X className="size-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={
              (!prompt.trim() && media.length === 0) ||
              generate.isPending ||
              upload.isPending
            }
            className="w-full h-12 text-base font-semibold"
            size="lg"
          >
            {generate.isPending ? (
              <>
                <Loader2 className="mr-2 size-5 animate-spin" />
                Запуск...
              </>
            ) : upload.isPending ? (
              <>
                <Loader2 className="mr-2 size-5 animate-spin" />
                Загрузка файла...
              </>
            ) : (
              'Создать'
            )}
          </Button>
        </div>
      </div>
    );
  }

  // --- Model picker ---
  return (
    <div className="flex flex-col h-full pb-24">
      <div className="sticky top-0 z-10 px-4 py-3 bg-background/85 backdrop-blur-xl border-b border-border/50">
        <p className="text-xl font-bold tracking-tight">Создать</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Выберите нейросеть для генерации
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <ModelsLoader />
        ) : (
          <div className="flex flex-col">
            {(['image', 'video', 'audio'] as const).map((cat) => {
              const catModels = models.filter(
                (m) => m.mainCategory === cat || m.categories?.includes(cat)
              );
              if (!catModels.length) return null;
              const catLabel =
                cat === 'image'
                  ? '🖼️ Изображения'
                  : cat === 'video'
                    ? '🎬 Видео'
                    : '🎵 Аудио';
              return (
                <div key={cat}>
                  <div className="px-4 py-2.5 bg-secondary/30 border-b border-border/30">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {catLabel}
                    </p>
                  </div>
                  {catModels.map((m) => {
                    const cost =
                      m.versions?.find((v) => v.default)?.cost ??
                      m.versions?.[0]?.cost ??
                      1;
                    return (
                      <button
                        key={m.tech_name}
                        onClick={() => setSelectedTech(m.tech_name)}
                        className="flex items-center gap-3 px-4 py-3.5 w-full border-b border-border/40 hover:bg-secondary/40 active:bg-secondary/60 transition-colors text-left"
                      >
                        <Avatar className="size-11 rounded-xl border border-border/50 shrink-0">
                          <AvatarImage src={m.avatar} />
                          <AvatarFallback className="rounded-xl bg-secondary text-xs font-bold">
                            {m.model_name.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {m.model_name}
                          </p>
                          {m.versions && m.versions.length > 1 && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {m.versions.length} версии
                            </p>
                          )}
                        </div>
                        <Badge
                          variant="secondary"
                          className="gap-1 text-xs shrink-0"
                        >
                          <svg
                            width="9"
                            height="9"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="opacity-60"
                          >
                            <path d="M12 2L2 9l10 13 10-13L12 2zm0 3.5L18.5 9 12 18.5 5.5 9 12 5.5z" />
                          </svg>
                          {cost}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Generate;
