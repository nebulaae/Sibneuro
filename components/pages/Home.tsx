'use client';

import { useAIModels } from '@/hooks/useModels';
import { useRoles } from '@/hooks/useRoles';
import { useUser } from '@/hooks/useUser';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorComponent } from '@/components/states/Error';
import { useUI } from '@/hooks/useApiExtras';

const TRENDING_ITEMS = [
  { icon: '🎨', title: 'Создай свой 2D-аватар' },
  { icon: '🤖', title: 'Открой возможности GPT' },
  { icon: '📸', title: 'Фотореалистичные изображения' },
  { icon: '💬', title: 'AI-чат для поддержки клиентов' },
];

function localize(v: any, lang = 'ru'): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  return v[lang] || v.en || v.ru || Object.values(v)[0] || '';
}

export const Home = () => {
  const {
    data: models,
    isLoading: modelsLoading,
    isError: modelsError,
    refetch: refetchModels,
  } = useAIModels();
  const { data: trends, isLoading: trendsLoading } = useUI('trends');
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const { data: userData } = useUser();

  const displayModels = models?.slice(0, 8) || [];
  const displayRoles = roles?.slice(0, 5) || [];
  const tokens = userData?.user?.tokens ?? 0;

  if (modelsError) {
    return (
      <div className="state-center section-padding">
        <ErrorComponent
          title="Ошибка"
          description="Не удалось загрузить данные."
          onRetry={refetchModels}
        />
      </div>
    );
  }

  return (
    <div className="">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <span className="text-xl font-semibold tracking-tight">All AI</span>
        <Badge
          variant="secondary"
          className="gap-1.5 px-2.5 h-7 text-sm font-medium"
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="opacity-70"
          >
            <path d="M12 2L2 9l10 13 10-13L12 2zm0 3.5L18.5 9 12 18.5 5.5 9 12 5.5z" />
          </svg>
          {tokens}
        </Badge>
      </div>

      {/* Models Grid */}
      <section className="px-4 pt-5">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3.5">
          Модели
        </p>
        <div className="grid grid-cols-4 gap-y-4 gap-x-2">
          {modelsLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <Skeleton className="size-12 rounded-full" />
                  <Skeleton className="w-11 h-2.5" />
                </div>
              ))
            : displayModels.map((m) => (
                <button
                  key={m.tech_name}
                  className="flex flex-col items-center gap-1.5 focus:outline-none hover:opacity-80 transition-opacity"
                >
                  <Avatar className="size-12 border">
                    <AvatarImage
                      src={
                        m.avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(m.model_name)}&background=1c1c1c&color=ffffff`
                      }
                    />
                    <AvatarFallback className="text-[13px] bg-secondary font-semibold">
                      {m.model_name.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[11px] text-muted-foreground font-medium text-center max-w-14 truncate">
                    {m.model_name}
                  </span>
                </button>
              ))}
        </div>
      </section>

      <Separator className="mt-5" />

      {/* AI Assistants */}
      <section className="pt-5">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3.5 px-4">
          AI Ассистенты
        </p>
        <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar pb-1">
          {rolesLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-2 shrink-0 w-18"
                >
                  <Skeleton className="size-14 rounded-xl" />
                  <Skeleton className="w-14 h-2.5" />
                </div>
              ))
            : displayRoles.map((role) => (
                <button
                  key={role.id}
                  className="shrink-0 flex flex-col items-center gap-2 w-18 hover:opacity-80 transition-opacity"
                >
                  <Avatar className="size-14 border rounded-xl">
                    <AvatarImage src={role.image || ''} />
                    <AvatarFallback className="rounded-xl bg-secondary text-lg">
                      {localize(role.label).slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[11px] text-muted-foreground font-medium text-center leading-tight w-full truncate">
                    {localize(role.label)}
                  </span>
                </button>
              ))}
        </div>
      </section>

      <Separator className="mt-5" />

      {/* Trending */}
      <section className="px-4 pt-5">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3.5">
          В тренде
        </p>
        <div className="flex flex-col gap-1">
          {trendsLoading ? (
            <Skeleton className="w-full h-12 rounded-xl" />
          ) : (
            (trends || []).map((item: any, i: number) => (
              <button
                key={i}
                className="flex items-center gap-3 py-2.5 px-3 rounded-xl w-full text-left text-foreground hover:bg-secondary transition-colors"
              >
                {item.image && (
                  <img
                    src={item.image}
                    alt=""
                    className="size-8 rounded-lg object-cover shrink-0"
                  />
                )}
                <span className="text-sm font-medium flex-1">
                  {localize(item.title)}
                </span>
                {/* Иконка стрелки */}
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export { Home as default };
