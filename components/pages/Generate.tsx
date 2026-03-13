'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAIModels } from '@/hooks/useModels';
import { useGenerateAI } from '@/hooks/useGenerations';
import { useUpload } from '@/hooks/useApiExtras';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, Loader2, ImagePlus, X } from 'lucide-react';
import { ModelsLoader } from '@/components/states/Loading';
import { toast } from 'sonner';

export const Generate = () => {
  const router = useRouter();
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [media, setMedia] = useState<
    { type: string; url: string; file: File }[]
  >([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: allModels, isLoading } = useAIModels();
  const generate = useGenerateAI();
  const upload = useUpload();

  const models = (allModels || []).filter(
    (m) => !m.categories?.includes('text')
  );
  const selected = models.find((m) => m.tech_name === selectedTech);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    try {
      const uploaded = await upload.mutateAsync(files[0]);
      setMedia((prev) => [
        ...prev,
        { type: uploaded.type, url: uploaded.url, file: files[0] },
      ]);
    } catch (err) {
      toast.error('Ошибка загрузки файла');
    }
  };

  const removeMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = () => {
    if (!selected || (!prompt.trim() && media.length === 0)) return;

    const defaultVersion =
      selected.versions?.find((v) => v.default) || selected.versions?.[0];

    generate.mutate(
      {
        tech_name: selected.tech_name,
        version: defaultVersion?.label,
        inputs: {
          text: prompt || null,
          media: media.map((m) => ({
            type: m.type,
            format: 'url',
            input: m.url,
          })),
        },
      },
      {
        onSuccess: (data) => {
          // Редирект в чат для отслеживания результата
          if (data.dialogue_id) {
            router.push(`/chats/${data.dialogue_id}`);
          }
        },
      }
    );
  };

  if (selected) {
    const cost =
      selected.versions?.find((v) => v.default)?.cost ??
      selected.versions?.[0]?.cost ??
      1;

    return (
      <div className="flex flex-col h-full pb-20">
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border">
          <button
            onClick={() => {
              setSelectedTech(null);
              setPrompt('');
              setMedia([]);
            }}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="size-4" /> Назад
          </button>
          <span className="font-semibold">{selected.model_name}</span>
          <Badge variant="secondary" className="gap-1 text-xs">
            💎 {cost}
          </Badge>
        </div>

        <div className="flex flex-col gap-4 p-4">
          <div className="relative">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Опишите, что хотите создать..."
              className="resize-none min-h-30 bg-secondary border-border text-sm pb-12"
            />

            <div className="absolute bottom-2 left-2 flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*,.heic,video/*,audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-muted-foreground"
                onClick={() => fileInputRef.current?.click()}
                disabled={upload.isPending}
              >
                {upload.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ImagePlus className="size-4" />
                )}
              </Button>
            </div>
          </div>

          {media.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {media.map((m, i) => (
                <div
                  key={i}
                  className="relative size-16 rounded-md overflow-hidden border border-border"
                >
                  {m.type === 'image' ? (
                    <img
                      src={URL.createObjectURL(m.file)}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center text-xs">
                      Медиа
                    </div>
                  )}
                  <button
                    onClick={() => removeMedia(i)}
                    className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5"
                  >
                    <X className="size-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={
              (!prompt.trim() && media.length === 0) ||
              generate.isPending ||
              upload.isPending
            }
            className="w-full h-11"
          >
            {generate.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Запуск...
              </>
            ) : (
              'Создать'
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-20">
      <div className="sticky top-0 z-10 px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border">
        <span className="text-xl font-semibold tracking-tight">
          Создать генерацию
        </span>
      </div>
      <div className="px-4 py-4">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          Выберите модель
        </p>
        <p className="text-sm text-muted-foreground">
          Доступные нейросети для медиа
        </p>
      </div>
      <Separator />
      <div className="flex flex-col">
        {isLoading ? (
          <ModelsLoader />
        ) : (
          models.map((m) => (
            <button
              key={m.tech_name}
              onClick={() => setSelectedTech(m.tech_name)}
              className="flex items-center gap-3 p-4 border-b border-border/50 hover:bg-secondary transition-colors text-left w-full"
            >
              <Avatar className="size-10 rounded-xl border shrink-0">
                <AvatarImage src={m.avatar} />
                <AvatarFallback className="rounded-xl bg-muted text-xs font-bold">
                  {m.model_name.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">
                  {m.model_name}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {m.mainCategory === 'image' ? 'Фото' : 'Видео'}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export { Generate as default };
