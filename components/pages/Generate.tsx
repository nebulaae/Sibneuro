'use client';

import { useState } from 'react';
import { useAIModels } from '@/hooks/useModels';
import { useGenerateAI } from '@/hooks/useGenerations';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { ModelsLoader } from '@/components/states/Loading';

export const Generate = () => {
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');

  const { data: allModels, isLoading } = useAIModels();
  const generate = useGenerateAI();

  const models = (allModels || []).filter(
    (m) => !m.categories?.includes('text')
  );
  const selected = models.find((m) => m.tech_name === selectedTech);

  const handleGenerate = () => {
    if (!selected || !prompt.trim()) return;
    const defaultVersion =
      selected.versions?.find((v) => v.default) || selected.versions?.[0];

    generate.mutate({
      tech_name: selected.tech_name,
      version: defaultVersion?.label,
      inputs: { text: prompt, media: [] },
    });
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
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Опишите, что хотите создать..."
            className="resize-none min-h-30 bg-secondary border-border text-sm"
          />

          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || generate.isPending}
            className="w-full h-11"
          >
            {generate.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Генерация...
              </>
            ) : (
              'Создать'
            )}
          </Button>

          {generate.data?.result && (
            <div className="p-4 bg-secondary border border-border rounded-xl mt-2">
              {generate.data.result.text && (
                <p className="text-sm mb-3">{generate.data.result.text}</p>
              )}
              {generate.data.result.media?.map((m: any, i: number) => (
                <div key={i} className="mt-2 rounded-lg overflow-hidden">
                  {m.type === 'image' && (
                    <img
                      src={m.input || m.url}
                      alt="Result"
                      className="w-full h-auto object-cover"
                    />
                  )}
                  {m.type === 'video' && (
                    <video src={m.input || m.url} controls className="w-full" />
                  )}
                  {m.type === 'audio' && (
                    <audio
                      src={m.input || m.url}
                      controls
                      className="w-full mt-2"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
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

export { Generate as default }