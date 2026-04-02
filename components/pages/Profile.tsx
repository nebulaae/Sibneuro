'use client';

import { useUser } from '@/hooks/useUser';
import { useRequests } from '@/hooks/useRequests';
import { useAuth } from '@/hooks/useAuth';
import {
  useReferrals,
  usePaymentLink,
  useApiTokens,
  useGenerateApiToken,
  useChangePassword,
  useRemoveAuthMethod,
  useAuthMethodLink,
} from '@/hooks/useApiExtras';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LogOut,
  Users,
  Star,
  Loader2,
  ExternalLink,
  Key,
  Copy,
  Check,
} from 'lucide-react';
import { GenerationsEmpty } from '@/components/states/Empty';
import { timeAgo } from '@/lib/utils';
import { toast } from 'sonner';
import { useState } from 'react';

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  completed: { color: 'text-emerald-500', label: 'Готово' },
  error: { color: 'text-red-500', label: 'Ошибка' },
  processing: { color: 'text-amber-500', label: 'Обработка' },
};

export const Profile = () => {
  const { user: tgUser, logout } = useAuth();
  const { data: userData, isLoading: userLoading } = useUser();
  const { data: refData } = useReferrals();
  const { data: paymentUrl } = usePaymentLink();
  const { data: apiTokens } = useApiTokens();
  const generateToken = useGenerateApiToken();
  const {
    data: reqData,
    isLoading: reqLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useRequests();

  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const tokens = userData?.user?.tokens ?? 0;
  const isPremium = userData?.user?.premium ?? false;
  const premiumEnd = userData?.user?.premium_end;
  const requests = reqData?.pages.flatMap((p) => p) ?? [];
  const refStats = (refData as any)?.stats;

  const name = tgUser
    ? `${tgUser.first_name} ${tgUser.last_name || ''}`.trim()
    : 'Пользователь';
  const username = tgUser?.username || '';

  const handleTopUp = () => {
    if (paymentUrl) window.open(paymentUrl, '_blank');
    else toast.error('Ссылка на оплату недоступна');
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token).then(() => {
      setCopiedToken(token);
      toast.success('Токен скопирован');
      setTimeout(() => setCopiedToken(null), 2000);
    });
  };

  const handleGenerateToken = () => {
    generateToken.mutate(undefined, {
      onSuccess: (data) => {
        toast.success('Новый API-токен создан');
        handleCopyToken(data.token);
      },
      onError: () => toast.error('Не удалось создать токен'),
    });
  };

  return (
    <div className="flex flex-col pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-background/85 backdrop-blur-xl border-b border-border/50">
        <span className="text-xl font-bold tracking-tight">Профиль</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="h-8 text-muted-foreground hover:text-destructive gap-1.5"
        >
          <LogOut className="size-3.5" />
          <span className="text-xs">Выйти</span>
        </Button>
      </div>

      {/* User card */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-16 border-2 border-border/50 shadow-sm">
            <AvatarImage src={tgUser?.photo_url} />
            <AvatarFallback className="bg-secondary text-xl font-bold">
              {name[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold truncate">{name}</p>
              {isPremium && (
                <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-[10px] px-1.5">
                  <Star className="size-2.5 mr-0.5 fill-current" />
                  Premium
                </Badge>
              )}
            </div>
            {username && (
              <p className="text-sm text-muted-foreground">@{username}</p>
            )}
            {isPremium && premiumEnd && (
              <p className="text-xs text-muted-foreground mt-0.5">
                до {new Date(premiumEnd * 1000).toLocaleDateString('ru-RU')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 grid grid-cols-2 gap-3 mb-4">
        {/* Balance */}
        <button
          onClick={handleTopUp}
          className="flex flex-col gap-1 p-4 rounded-2xl bg-secondary/50 border border-border/50 hover:bg-secondary/70 active:scale-[0.98] transition-all text-left"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Токены</p>
            <ExternalLink className="size-3.5 text-muted-foreground/50" />
          </div>
          {userLoading ? (
            <Skeleton className="w-16 h-7" />
          ) : (
            <div className="flex items-end gap-1">
              <span className="text-2xl font-bold">{tokens}</span>
              <span className="text-xs text-muted-foreground mb-0.5">💎</span>
            </div>
          )}
          <p className="text-[10px] text-primary font-medium">Пополнить →</p>
        </button>

        {/* Referrals */}
        <div className="flex flex-col gap-1 p-4 rounded-2xl bg-secondary/50 border border-border/50 text-left">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              Рефералы
            </p>
            <Users className="size-3.5 text-muted-foreground/50" />
          </div>
          {!refStats ? (
            <Skeleton className="w-12 h-7" />
          ) : (
            <span className="text-2xl font-bold">{refStats?.total ?? 0}</span>
          )}
          <p className="text-[10px] text-muted-foreground">
            {refStats?.earned ?? 0} 💎 заработано
          </p>
        </div>
      </div>

      <Separator />

      {/* API Tokens */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            API-токены
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1.5 text-primary"
            onClick={handleGenerateToken}
            disabled={generateToken.isPending}
          >
            {generateToken.isPending ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Key className="size-3" />
            )}
            Создать
          </Button>
        </div>

        {!apiTokens || apiTokens.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Нет токенов. Создайте для доступа к API.
          </p>
        ) : (
          <div className="space-y-2">
            {apiTokens.map((t: any) => (
              <div
                key={t.id}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-secondary/50 border border-border/40"
              >
                <code className="flex-1 text-xs text-muted-foreground truncate font-mono">
                  {t.token}
                </code>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {t.generations} запросов
                </span>
                <button
                  onClick={() => handleCopyToken(t.token)}
                  className="shrink-0 p-1 rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  {copiedToken === t.token ? (
                    <Check className="size-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="size-3.5 text-muted-foreground" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator className="mt-3" />

      {/* Generation history */}
      <div className="px-4 pt-4">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          История генераций
        </p>

        {reqLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Skeleton className="size-9 rounded-xl shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="w-1/2 h-3.5" />
                  <Skeleton className="w-1/3 h-2.5" />
                </div>
                <Skeleton className="w-12 h-5 rounded-full" />
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <GenerationsEmpty />
        ) : (
          <>
            <div className="space-y-1">
              {requests.map((req) => {
                const status = STATUS_CONFIG[req.status] || {
                  color: 'text-muted-foreground',
                  label: req.status,
                };
                return (
                  <div
                    key={req.id}
                    className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0"
                  >
                    <div className="size-9 rounded-xl bg-secondary/60 border border-border/40 flex items-center justify-center shrink-0">
                      <span className="text-base">
                        {req.status === 'completed'
                          ? '✅'
                          : req.status === 'error'
                            ? '❌'
                            : '⏳'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {req.model}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {req.version} · {timeAgo(req.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {req.cost} 💎
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasNextPage && (
              <div className="pt-3">
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

export default Profile;
