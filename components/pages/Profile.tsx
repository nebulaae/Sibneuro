'use client';

import { useUser } from '@/hooks/useUser';
import { useRequests } from '@/hooks/useRequests';
import { useAuth } from '@/hooks/useAuth';
import { useReferrals } from '@/hooks/useApiExtras';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { LogOut, Users, Star, Diamond, Clock } from 'lucide-react';
import { GenerationsEmpty } from '@/components/states/Empty';

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  completed: { color: 'text-green-500', label: 'Готово' },
  error: { color: 'text-red-500', label: 'Ошибка' },
  processing: { color: 'text-yellow-500', label: 'В процессе' },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} м`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ч`;
  return `${Math.floor(diff / 86_400_000)} д`;
}

export const Profile = () => {
  const { user: tgUser, logout } = useAuth();
  const { data: userData, isLoading: userLoading } = useUser();
  const { data: refData } = useReferrals();
  const {
    data: reqData,
    isLoading: reqLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useRequests();

  const tokens = userData?.user?.tokens ?? 0;
  const isPremium = userData?.user?.premium ?? false;
  const requests = reqData?.pages.flatMap((p) => p) ?? [];
  const refStats = refData?.stats;

  const name = tgUser
    ? `${tgUser.first_name} ${tgUser.last_name || ''}`.trim()
    : 'Пользователь';
  const username = tgUser?.username || '';

  return (
    <div className="flex flex-col h-full pb-20">
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border">
        <span className="text-xl font-semibold tracking-tight">Профиль</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="h-8 text-muted-foreground hover:text-destructive"
        >
          <LogOut className="size-4 mr-2" /> Выйти
        </Button>
      </div>

      <div className="flex items-center gap-4 p-5">
        <Avatar className="size-16 border-2 border-border shadow-sm">
          <AvatarImage src={tgUser?.photo_url} />
          <AvatarFallback className="bg-secondary text-lg font-bold">
            {name[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="text-lg font-semibold text-foreground">{name}</div>
          {username && (
            <div className="text-sm text-muted-foreground mt-0.5">
              @{username}
            </div>
          )}
        </div>
      </div>

      <Separator />

      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between p-4 bg-secondary/50 border border-border rounded-xl">
          <div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Баланс
            </div>
            {userLoading ? (
              <Skeleton className="w-16 h-7" />
            ) : (
              <div className="flex items-center gap-2 text-2xl font-bold">
                <Diamond className="size-5 text-primary" /> {tokens}
              </div>
            )}
          </div>
          <Button size="sm">Пополнить</Button>
        </div>

        <button className="flex items-center gap-3 p-3 w-full border border-border rounded-xl hover:bg-secondary transition-colors text-left">
          <div className="size-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
            <Users className="size-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">
              Заработано токенов: {refStats?.total_tokens || 0}
            </div>
            <div className="text-xs text-muted-foreground">
              Рефералов: {refStats?.unique_referrals || 0}
            </div>
          </div>
        </button>

        {!isPremium && (
          <button className="flex items-center gap-3 p-3 w-full border border-border rounded-xl hover:bg-secondary transition-colors text-left">
            <div className="size-10 bg-amber-500/10 text-amber-500 rounded-lg flex items-center justify-center shrink-0">
              <Star className="size-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">Премиум не активен</div>
              <div className="text-xs text-muted-foreground">
                Получить безлимит
              </div>
            </div>
          </button>
        )}
      </div>

      <Separator />

      <div className="px-4 py-4">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Мои генерации
        </p>
      </div>

      <div className="flex flex-col">
        {reqLoading ? (
          <div className="flex flex-col px-4 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="w-1/2 h-4" />
                  <Skeleton className="w-1/4 h-3" />
                </div>
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <GenerationsEmpty />
        ) : (
          <>
            {requests.map((r, i) => {
              const status =
                STATUS_CONFIG[r.status] || STATUS_CONFIG.processing;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 p-4 border-b border-border/50"
                >
                  <div className="size-10 rounded-xl bg-secondary border border-border flex items-center justify-center shrink-0">
                    <Clock className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {r.model}
                    </div>
                    <div className="text-xs flex items-center gap-1.5 mt-1">
                      <span className={`${status.color} font-medium`}>
                        {status.label}
                      </span>
                      <span className="text-muted-foreground">
                        · {r.version}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge
                      variant="outline"
                      className="text-[10px] gap-1 h-5 bg-background"
                    >
                      💎 {r.cost}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {timeAgo(r.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
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

export { Profile as default };
