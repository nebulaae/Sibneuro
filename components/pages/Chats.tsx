'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useChats } from '@/hooks/useChats';
import { useAIModels } from '@/hooks/useModels';
import { useRoles } from '@/hooks/useRoles';
import { convertMediaToInputs, useGenerateAI } from '@/hooks/useGenerations';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChatsLoader } from '@/components/states/Loading';
import { ChatsEmpty } from '@/components/states/Empty';
import { ErrorComponent } from '@/components/states/Error';
import { MessageSquarePlus, Loader2 } from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import { toast } from 'sonner';
import { useHaptic } from '@/hooks/useHaptic';
import { cn } from '@/lib/utils';

const glassThin = cn(
  'bg-white/[.07] dark:bg-black/[.45] backdrop-blur-xl',
  'border border-white/[.14]'
);

// Сохраняем данные модели в sessionStorage при переходе в диалог
function cacheDialogueModel(
  dialogueId: string,
  model: string,
  version: string,
  roleId: number | null | undefined
) {
  try {
    sessionStorage.setItem(
      `dialogue_model_${dialogueId}`,
      JSON.stringify({ model, version, role_id: roleId ?? null })
    );
  } catch {}
}

export const Chats = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const haptic = useHaptic();
  const modelParam = searchParams.get('model');
  const roleParam = searchParams.get('role');

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useChats();
  const { data: models } = useAIModels();
  const { data: roles } = useRoles();
  const generate = useGenerateAI();
  const chats = data?.pages.flatMap((p) => p) ?? [];
  const startedRef = useRef(false);

  useEffect(() => {
    if (!modelParam && !roleParam) return;
    if (startedRef.current || generate.isPending) return;
    const modelsReady = !!models;
    const rolesReady = roleParam ? !!roles : true;
    if (!modelsReady || !rolesReady) return;

    const role = roleParam
      ? roles?.find((r) => r.id === parseInt(roleParam))
      : null;
    if (roleParam && !role) {
      toast.error('Ассистент не найден');
      router.replace('/chats');
      return;
    }

    let techName: string | null = null,
      version: string | undefined;
    if (modelParam) {
      const model = models?.find((m) => m.tech_name === modelParam);
      if (!model) {
        toast.error('Модель не найдена');
        router.replace('/chats');
        return;
      }
      techName = model.tech_name;
      version = (model.versions?.find((v) => v.default) || model.versions?.[0])
        ?.label;
    } else if (roleParam && role) {
      const textModel = models?.find(
        (m) => m.categories?.includes('text') || m.mainCategory === 'text'
      );
      techName = textModel?.tech_name || null;
      version = (
        textModel?.versions?.find((v) => v.default) || textModel?.versions?.[0]
      )?.label;
    }
    if (!techName) {
      toast.error('Подходящая модель не найдена');
      router.replace('/chats');
      return;
    }

    startedRef.current = true;
    const inputs = convertMediaToInputs('Привет', []);
    generate.mutate(
      { tech_name: techName, version, inputs, role_id: role ? role.id : null },
      {
        onSuccess: (d) => {
          if (d.dialogue_id) {
            // Кешируем модель перед переходом
            cacheDialogueModel(
              d.dialogue_id,
              techName!,
              version || '',
              role?.id ?? null
            );
            router.replace(`/chats/${d.dialogue_id}`);
          } else {
            toast.error('Не удалось получить ID диалога');
            startedRef.current = false;
            router.replace('/chats');
          }
        },
        onError: () => {
          startedRef.current = false;
          router.replace('/chats');
        },
      }
    );
  }, [modelParam, roleParam, models, roles]);

  if (isError)
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <ErrorComponent
          title="Ошибка"
          description="Не удалось загрузить чаты."
          onRetry={refetch}
        />
      </div>
    );

  if (generate.isPending && (modelParam || roleParam))
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="size-8 animate-spin text-white/40" />
        <p className="text-[14px] text-white/50">Создаём диалог...</p>
      </div>
    );

  return (
    <div className="flex flex-col h-full pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))] max-w-7xl mx-auto">
      {/* Header */}
      <div
        className={cn(
          'sticky top-0 z-40 flex items-center justify-between px-5 py-3.5',
          'bg-white/4 dark:bg-black/35 backdrop-blur-2xl backdrop-saturate-150',
          'border-b border-white/10',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
        )}
      >
        <span className="text-[22px] font-bold tracking-[-0.5px]">Чаты</span>
        <button
          onClick={() => {
            haptic.light();
            router.push('/models');
          }}
          className={cn(
            'size-9 rounded-full flex items-center justify-center',
            glassThin,
            'transition-all duration-280 ease-[cubic-bezier(0.32,0.72,0,1)]',
            'active:scale-[0.88]'
          )}
          title="Новый чат"
        >
          <MessageSquarePlus className="size-5 text-white/60" />
        </button>
      </div>

      {/* Chat list */}
      <div className="flex flex-col flex-1 overflow-y-auto">
        {isLoading ? (
          <ChatsLoader />
        ) : chats.length === 0 ? (
          <div className="flex items-center justify-center flex-1 p-8">
            <ChatsEmpty />
          </div>
        ) : (
          <>
            {chats.map((chat) => {
              // Определяем читаемое название чата
              const displayName = chat.title || chat.model || 'Диалог';
              // Подпись: версия, но не tech_name
              const subtitle = chat.version || '';

              return (
                <button
                  key={chat.dialogue_id}
                  onClick={() => {
                    haptic.light();
                    // Кешируем модель при клике из списка
                    if (chat.model) {
                      cacheDialogueModel(
                        chat.dialogue_id,
                        chat.model,
                        chat.version,
                        chat.role_id
                      );
                    }
                    router.push(`/chats/${chat.dialogue_id}`);
                  }}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3.5 w-full text-left',
                    'border-b border-white/6',
                    'bg-transparent transition-colors duration-200',
                    'hover:bg-white/4 active:bg-white/[.07]'
                  )}
                >
                  <Avatar className="size-12 rounded-xl border border-white/[.14] shrink-0">
                    <AvatarImage
                      src={
                        chat.avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1c1c1c&color=ffffff`
                      }
                    />
                    <AvatarFallback className="rounded-xl bg-white/10 text-xs font-bold">
                      {displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-white truncate">
                      {displayName}
                    </div>
                    {subtitle && (
                      <div className="text-[12px] text-white/50 mt-0.5 truncate">
                        {subtitle}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[12px] text-white/40">
                      {timeAgo(chat.last_activity || chat.started_at)}
                    </span>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-white/25"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </button>
              );
            })}

            {hasNextPage && (
              <div className="p-4">
                <button
                  onClick={() => {
                    haptic.light();
                    fetchNextPage();
                  }}
                  disabled={isFetchingNextPage}
                  className={cn(
                    'w-full py-3 rounded-2xl text-[14px] font-semibold text-[#0A84FF]',
                    glassThin,
                    'transition-all duration-280 active:scale-[0.97]'
                  )}
                >
                  {isFetchingNextPage ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Загрузка...
                    </span>
                  ) : (
                    'Загрузить ещё'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Chats;
