'use client';

import { useUser } from '@/hooks/useUser';
import { useRequests } from '@/hooks/useRequests';
import { useAuth } from '@/hooks/useAuth';
import {
  useReferrals,
  useApiTokens,
  useGenerateApiToken,
} from '@/hooks/useApiExtras';
import { useBot } from '@/app/providers/BotProvider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  LogOut,
  Users,
  Star,
  Loader2,
  ExternalLink,
  Key,
  Copy,
  Check,
  Link as LinkIcon,
} from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import { toast } from 'sonner';
import { useState } from 'react';
import { useHaptic } from '@/hooks/useHaptic';
import { cn } from '@/lib/utils';

/* ── Shared ── */
const glassRegular = cn(
  'bg-white/[.10] dark:bg-black/[.55] backdrop-blur-2xl backdrop-saturate-180',
  'border border-white/[.18]',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.20),0_4px_16px_rgba(0,0,0,0.22)]'
);
const glassThin = cn(
  'bg-white/[.07] dark:bg-black/[.45] backdrop-blur-xl backdrop-saturate-150',
  'border border-white/[.14]',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
);
const spring =
  'transition-all duration-[280ms] [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]';

const GlassCard = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn(glassRegular, 'rounded-[20px]', className)}>
    {children}
  </div>
);

const STATUS: Record<string, { icon: string; color: string; label: string }> = {
  completed: { icon: '✅', color: '#34C759', label: 'Готово' },
  error: { icon: '❌', color: '#FF3B30', label: 'Ошибка' },
  processing: { icon: '⏳', color: '#FF9500', label: 'Обработка' },
};

export const Profile = () => {
  const haptic = useHaptic();
  const { user: tgUser, logout } = useAuth();
  const { bot } = useBot();
  const { data: userData, isLoading: userLoading } = useUser();
  const { data: refData } = useReferrals();
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
  const [copiedRef, setCopiedRef] = useState(false);

  const tokens = userData?.user?.tokens ?? 0;
  const isPremium = userData?.user?.premium ?? false;
  const premiumEnd = userData?.user?.premium_end;
  const requests = reqData?.pages.flatMap((p) => p) ?? [];
  const refStats = (refData as any)?.stats;
  const name = tgUser
    ? `${tgUser.first_name} ${tgUser.last_name || ''}`.trim()
    : 'Пользователь';
  const username = tgUser?.username || '';
  const userId = tgUser?.id;

  const referralLink =
    bot?.bot_username && userId
      ? `https://t.me/${bot.bot_username}?start=${userId}`
      : null;

  const handleTopUp = () => {
    haptic.medium();

    if (!bot?.bot_id) {
      toast.error('Бот не определён');
      return;
    }

    import('@/lib/api').then(({ default: api }) => {
      api
        .get('/api/payment-link', {
          params: {
            bot_id: bot.bot_id,
          },
        })
        .then(({ data }) => {
          if (data.success && data.url) {
            window.open(data.url, '_blank');
          } else {
            toast.error('Ссылка на оплату недоступна');
          }
        })
        .catch(() => toast.error('Ошибка получения ссылки на оплату'));
    });
  };

  const handleCopyToken = (token: string) => {
    haptic.success();
    navigator.clipboard.writeText(token).then(() => {
      setCopiedToken(token);
      toast.success('Токен скопирован');
      setTimeout(() => setCopiedToken(null), 2000);
    });
  };

  const handleCopyRef = () => {
    if (!referralLink) return;
    haptic.success();
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopiedRef(true);
      toast.success('Реферальная ссылка скопирована');
      setTimeout(() => setCopiedRef(false), 2000);
    });
  };

  const handleGenerateToken = () => {
    haptic.light();
    generateToken.mutate(undefined, {
      onSuccess: (d) => {
        toast.success('Новый API-токен создан');
        handleCopyToken(d.token);
      },
      onError: () => {
        haptic.error();
        toast.error('Не удалось создать токен');
      },
    });
  };

  return (
    <div className="pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))] max-w-[1280px] mx-auto">
      {/* ── Nav Bar ── */}
      <header
        className={cn(
          'sticky top-0 z-40 flex items-center justify-between px-5 py-[14px]',
          'bg-white/[.04] dark:bg-black/[.35] backdrop-blur-2xl backdrop-saturate-150',
          'border-b border-white/[.10]',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
        )}
      >
        <span className="text-[22px] font-bold tracking-[-0.5px]">Профиль</span>
        <button
          onClick={() => {
            haptic.heavy();
            logout();
          }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
            'bg-[rgba(255,59,48,0.12)] backdrop-blur-xl border border-[rgba(255,59,48,0.22)]',
            'shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]',
            'text-[#FF3B30] text-[13px] font-semibold',
            spring,
            'active:scale-[0.94]'
          )}
        >
          <LogOut size={13} />
          Выйти
        </button>
      </header>

      {/* ── User Hero ── */}
      <div className="px-5 pt-6 pb-5">
        <GlassCard className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.20),0_4px_16px_rgba(0,0,0,0.22)] flex-shrink-0">
              <Avatar className="size-full">
                <AvatarImage src={tgUser?.photo_url} />
                <AvatarFallback className="text-[22px] font-bold">
                  {name[0]}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[18px] font-bold tracking-[-0.3px] truncate">
                  {name}
                </p>
                {isPremium && (
                  <div className="inline-flex items-center gap-[3px] px-2 py-[2px] rounded-full bg-[rgba(255,204,0,0.18)] border border-[rgba(255,204,0,0.30)] backdrop-blur-xl text-[10px] font-bold text-[#b38600] flex-shrink-0">
                    <Star size={9} fill="currentColor" />
                    Premium
                  </div>
                )}
              </div>
              {username && (
                <p className="text-[14px] text-white/50">@{username}</p>
              )}
              {isPremium && premiumEnd && (
                <p className="text-[12px] text-white/30 mt-0.5">
                  до {new Date(premiumEnd * 1000).toLocaleDateString('ru-RU')}
                </p>
              )}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 gap-3 px-5 pb-5">
        {/* Balance */}
        <button
          onClick={handleTopUp}
          className={cn(
            'flex flex-col gap-1.5 p-[18px] rounded-[20px] text-left',
            glassRegular,
            spring,
            'active:scale-[0.96]'
          )}
        >
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-semibold tracking-[0.4px] uppercase text-white/50">
              Токены
            </span>
            <ExternalLink size={12} className="text-white/30" />
          </div>
          {userLoading ? (
            <div className={cn('w-16 h-8 rounded-lg', glassThin)} />
          ) : (
            <div className="flex items-end gap-1">
              <span className="text-[30px] font-bold tracking-[-0.8px] leading-none">
                {tokens}
              </span>
              <span className="text-[14px] mb-0.5">💎</span>
            </div>
          )}
          <span className="text-[11px] font-semibold text-[#0A84FF]">
            Пополнить →
          </span>
        </button>

        {/* Referrals */}
        <div
          className={cn(
            'flex flex-col gap-1.5 p-[18px] rounded-[20px]',
            glassRegular
          )}
        >
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-semibold tracking-[0.4px] uppercase text-white/50">
              Рефералы
            </span>
            <Users size={12} className="text-white/30" />
          </div>
          {!refStats ? (
            <div className={cn('w-12 h-8 rounded-lg', glassThin)} />
          ) : (
            <span className="text-[30px] font-bold tracking-[-0.8px] leading-none">
              {refStats?.total ?? refStats?.total_referrals ?? 0}
            </span>
          )}
          <span className="text-[11px] text-white/50">
            {refStats?.earned ?? refStats?.total_tokens ?? 0} 💎 заработано
          </span>
        </div>
      </div>

      {/* ── Referral Link ── */}
      {referralLink && (
        <div className="px-5 pb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold tracking-[0.7px] uppercase text-white/50">
              Реферальная ссылка
            </span>
            <LinkIcon size={12} className="text-white/30" />
          </div>
          <GlassCard className="flex items-center gap-2.5 px-[14px] py-[12px]">
            <span className="flex-1 text-[12px] text-white/70 overflow-hidden text-ellipsis whitespace-nowrap font-mono">
              {referralLink}
            </span>
            <button
              onClick={handleCopyRef}
              className={cn(
                'flex-shrink-0 p-1.5 rounded-lg',
                spring,
                'active:scale-[0.88]'
              )}
            >
              {copiedRef ? (
                <Check size={14} className="text-[#34C759]" />
              ) : (
                <Copy size={14} className="text-white/50" />
              )}
            </button>
          </GlassCard>
          <p className="text-[11px] text-white/30 mt-2 px-1">
            Поделитесь ссылкой — получайте бонусы за каждого приглашённого друга
          </p>
        </div>
      )}

      <div className="h-px bg-white/[.08] mb-5" />

      {/* ── API Tokens ── */}
      <div className="px-5 pb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold tracking-[0.7px] uppercase text-white/50">
            API-токены
          </span>
          <button
            onClick={handleGenerateToken}
            disabled={generateToken.isPending}
            className={cn(
              'flex items-center gap-1.5 px-3 py-[5px] rounded-full',
              'bg-[rgba(0,122,255,0.12)] backdrop-blur-xl border border-[rgba(0,122,255,0.22)]',
              'text-[#0A84FF] text-[12px] font-semibold',
              spring,
              'active:scale-[0.94]',
              generateToken.isPending && 'opacity-60'
            )}
          >
            {generateToken.isPending ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Key size={11} />
            )}
            Создать
          </button>
        </div>

        {!apiTokens || apiTokens.length === 0 ? (
          <p className="text-[13px] text-white/50 px-1">
            Нет токенов. Создайте для доступа к API.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {apiTokens.map((t: any) => (
              <GlassCard
                key={t.id}
                className="flex items-center gap-2.5 px-[14px] py-[10px]"
              >
                <code className="flex-1 text-[12px] text-white/50 overflow-hidden text-ellipsis whitespace-nowrap font-mono">
                  {t.token}
                </code>
                <span className="text-[10px] text-white/30 flex-shrink-0">
                  {t.generations} reqs
                </span>
                <button
                  onClick={() => handleCopyToken(t.token)}
                  className={cn(
                    'flex-shrink-0 p-1.5 rounded-lg',
                    spring,
                    'active:scale-[0.88]'
                  )}
                >
                  {copiedToken === t.token ? (
                    <Check size={14} className="text-[#34C759]" />
                  ) : (
                    <Copy size={14} className="text-white/50" />
                  )}
                </button>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      <div className="h-px bg-white/[.08] mb-5" />

      {/* ── History ── */}
      <div className="px-5">
        <span className="block text-[11px] font-bold tracking-[0.7px] uppercase text-white/50 mb-3">
          История генераций
        </span>

        {reqLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-10 h-10 rounded-2xl flex-shrink-0',
                    glassThin
                  )}
                />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className={cn('w-1/2 h-[13px] rounded', glassThin)} />
                  <div className={cn('w-1/3 h-[10px] rounded', glassThin)} />
                </div>
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <p className="text-[14px] text-white/50 py-4">Нет генераций</p>
        ) : (
          <div className="flex flex-col">
            {requests.map((req) => {
              const st = STATUS[req.status] || {
                icon: '⏳',
                color: 'rgba(255,255,255,0.5)',
                label: req.status,
              };
              return (
                <div
                  key={req.id}
                  className="flex items-center gap-3 pb-[14px] mb-[14px] border-b border-white/[.06]"
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center text-[18px]',
                      glassThin
                    )}
                  >
                    {st.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Показываем model как есть — это читаемое название из API */}
                    <p className="text-[14px] font-semibold truncate">
                      {req.model}
                    </p>
                    <p className="text-[12px] text-white/50 mt-0.5">
                      {req.version} · {timeAgo(req.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-[3px] flex-shrink-0">
                    <span
                      className="text-[12px] font-semibold"
                      style={{ color: st.color }}
                    >
                      {st.label}
                    </span>
                    <span className="text-[11px] text-white/30">
                      {req.cost} 💎
                    </span>
                  </div>
                </div>
              );
            })}

            {hasNextPage && (
              <button
                onClick={() => {
                  haptic.light();
                  fetchNextPage();
                }}
                disabled={isFetchingNextPage}
                className={cn(
                  'w-full py-3 rounded-2xl text-[14px] font-semibold text-[#0A84FF] mt-1',
                  glassThin,
                  spring,
                  'active:scale-[0.97]',
                  'flex items-center justify-center gap-2'
                )}
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Загрузка...
                  </>
                ) : (
                  'Загрузить ещё'
                )}
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes apple-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

export default Profile;