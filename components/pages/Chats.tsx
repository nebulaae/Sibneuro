'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useChats } from '@/hooks/useChats';
import { useAIModels } from '@/hooks/useModels';
import { useRoles } from '@/hooks/useRoles';
import { convertMediaToInputs, useGenerateAI } from '@/hooks/useGenerations';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChatsLoader } from '@/components/states/Loading';
import { ChatsEmpty } from '@/components/states/Empty';
import { ErrorComponent } from '@/components/states/Error';
import { MessageSquarePlus, Loader2 } from 'lucide-react';
import { timeAgo, localize } from '@/lib/utils';
import { toast } from 'sonner';

export const Chats = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  // Предотвращаем двойной запуск
  const startedRef = useRef(false);

  useEffect(() => {
    if (!modelParam && !roleParam) return;
    if (startedRef.current) return;
    if (generate.isPending) return;

    // Ждём загрузки данных
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

    // Если передана роль — ищем текстовую модель из списка, или берём первую текстовую
    let techName: string | null = null;
    let version: string | undefined;

    if (modelParam) {
      const model = models?.find((m) => m.tech_name === modelParam);
      if (!model) {
        toast.error('Модель не найдена');
        router.replace('/chats');
        return;
      }
      techName = model.tech_name;
      const def = model.versions?.find((v) => v.default) || model.versions?.[0];
      version = def?.label;
    } else if (roleParam && role) {
      // Ищем подходящую текстовую модель
      const textModel = models?.find(
        (m) => m.categories?.includes('text') || m.mainCategory === 'text'
      );
      techName = textModel?.tech_name || null;
      const def =
        textModel?.versions?.find((v) => v.default) || textModel?.versions?.[0];
      version = def?.label;
    }

    if (!techName) {
      toast.error('Подходящая модель не найдена');
      router.replace('/chats');
      return;
    }

    startedRef.current = true;

    const inputs = convertMediaToInputs(' ', []);
    generate.mutate(
      {
        tech_name: techName,
        version,
        inputs,
        role_id: role ? role.id : null,
      },
      {
        onSuccess: (data) => {
          if (data.dialogue_id) {
            router.replace(`/chats/${data.dialogue_id}`);
          } else {
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

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <ErrorComponent
          title="Ошибка"
          description="Не удалось загрузить чаты."
          onRetry={refetch}
        />
      </div>
    );
  }

  if (generate.isPending && (modelParam || roleParam)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Создаём диалог...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-background/85 backdrop-blur-xl border-b border-border/50">
        <span className="text-xl font-bold tracking-tight">Чаты</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-full"
          onClick={() => router.push('/models')}
          title="Новый чат"
        >
          <MessageSquarePlus className="size-5 text-muted-foreground" />
        </Button>
      </div>

      <div className="flex flex-col flex-1 overflow-y-auto">
        {isLoading ? (
          <ChatsLoader />
        ) : chats.length === 0 ? (
          <div className="flex items-center justify-center flex-1 p-8">
            <ChatsEmpty />
          </div>
        ) : (
          <>
            {chats.map((chat) => (
              <button
                key={chat.dialogue_id}
                onClick={() => router.push(`/chats/${chat.dialogue_id}`)}
                className="flex items-center gap-3 px-4 py-3.5 w-full border-b border-border/40 hover:bg-secondary/40 active:bg-secondary/60 transition-colors text-left"
              >
                <Avatar className="size-12 rounded-xl border border-border/50 shrink-0">
                  <AvatarImage
                    src={
                      chat.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.model || 'AI')}&background=1c1c1c&color=ffffff`
                    }
                  />
                  <AvatarFallback className="rounded-xl bg-secondary text-xs font-bold">
                    {(chat.model || 'AI').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">
                    {chat.title || chat.model || 'Диалог'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    {chat.version}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(chat.last_activity || chat.started_at)}
                  </span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-muted-foreground/40"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </button>
            ))}

            {hasNextPage && (
              <div className="p-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Загрузка...
                    </>
                  ) : (
                    'Загрузить ещё'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Chats;
