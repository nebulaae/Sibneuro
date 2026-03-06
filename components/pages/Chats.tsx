'use client';

import { useChats } from '@/hooks/useChats';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChatsLoader } from '@/components/states/Loading';
import { ChatsEmpty } from '@/components/states/Empty';
import { ErrorComponent } from '@/components/states/Error';
import { MessageSquarePlus } from 'lucide-react';

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return 'сейчас';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} м`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ч`;
  return `${Math.floor(diff / 86_400_000)} д`;
}

export const Chats = () => {
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useChats();
  const chats = data?.pages.flatMap((p) => p) ?? [];

  if (isError) {
    return (
      <div className="state-center section-padding">
        <ErrorComponent
          title="Ошибка"
          description="Не удалось загрузить чаты."
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-20">
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border">
        <span className="text-xl font-semibold tracking-tight">Чаты</span>
        <Button variant="ghost" size="icon" className="size-8 rounded-full">
          <MessageSquarePlus className="size-5 text-muted-foreground" />
        </Button>
      </div>

      <div className="flex flex-col">
        {isLoading ? (
          <ChatsLoader />
        ) : chats.length === 0 ? (
          <ChatsEmpty />
        ) : (
          <>
            {chats.map((chat) => (
              <button
                key={chat.dialogue_id}
                className="flex items-center gap-3 px-4 py-3 w-full border-b border-border/50 transition-colors hover:bg-secondary text-left"
              >
                <Avatar className="size-11 rounded-xl border shrink-0">
                  <AvatarImage
                    src={
                      chat.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.model)}&background=1c1c1c&color=ffffff`
                    }
                  />
                  <AvatarFallback className="rounded-xl bg-muted text-xs font-semibold">
                    {chat.model?.slice(0, 2) || 'AI'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">
                    {chat.title || chat.model}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    {chat.version}
                  </div>
                </div>

                <span className="text-xs text-muted-foreground shrink-0">
                  {timeAgo(chat.last_activity || chat.started_at)}
                </span>
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
                  {isFetchingNextPage ? 'Загрузка...' : 'Загрузить ещё'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export { Chats as default }