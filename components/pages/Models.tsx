'use client';

import { useState } from 'react';
import { useAIModels } from '@/hooks/useModels';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

// Импортируем наши новые UI States
import { ModelsEmpty } from '@/components/states/Empty';
import { ModelsLoader } from '@/components/states/Loading';
import { ErrorComponent } from '@/components/states/Error';

const TABS = [
  { key: 'all', label: 'Все' },
  { key: 'text', label: 'Текст' },
  { key: 'image', label: 'Фото' },
  { key: 'video', label: 'Видео' },
  { key: 'audio', label: 'Аудио' },
];

export const Models = () => {
  const [tab, setTab] = useState('all');
  const { data: models, isLoading, isError, refetch } = useAIModels();

  if (isError) {
    return (
      <div className="state-center section-padding">
        <ErrorComponent
          title="Ошибка загрузки"
          description="Не удалось получить список моделей."
          onRetry={refetch}
        />
      </div>
    );
  }

  const filtered =
    tab === 'all'
      ? models || []
      : (models || []).filter(
          (m) => m.categories?.includes(tab) || m.mainCategory === tab
        );

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-xl font-semibold tracking-tight">Модели</span>
      </div>

      <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              tab === t.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 pb-20">
        {isLoading ? (
          <ModelsLoader />
        ) : filtered.length === 0 ? (
          <ModelsEmpty />
        ) : (
          <div className="flex flex-col">
            {filtered.map((m, i) => {
              const cost =
                m.versions?.find((v) => v.default)?.cost ??
                m.versions?.[0]?.cost ??
                1;
              const avatarUrl =
                m.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(m.model_name)}&background=1c1c1c&color=ffffff&size=128`;

              return (
                <button
                  key={m.tech_name}
                  className="flex items-center gap-3 py-3 w-full border-b border-border/50 last:border-0 hover:bg-muted/50 transition-colors text-left"
                >
                  <Avatar className="size-10 rounded-xl border shrink-0">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback className="bg-muted text-xs font-semibold rounded-xl">
                      {m.model_name.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {m.model_name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {m.mainCategory === 'image'
                        ? 'Фото'
                        : m.mainCategory === 'video'
                          ? 'Видео'
                          : m.mainCategory === 'audio'
                            ? 'Аудио'
                            : 'Текст'}
                    </div>
                  </div>

                  <Badge variant="secondary" className="gap-1 px-2 shrink-0">
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="opacity-70"
                    >
                      <path d="M12 2L2 9l10 13 10-13L12 2zm0 3.5L18.5 9 12 18.5 5.5 9 12 5.5z" />
                    </svg>
                    {cost}
                  </Badge>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export { Models as default }