'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useRequests } from '@/hooks/useRequests';
import { useAuth } from '@/hooks/useAuth';
import {
  useReferrals,
  useApiTokens,
  useGenerateApiToken,
  useRecurrentStatus,
  useCancelRecurrent,
} from '@/hooks/useApiExtras';
import { useBot } from '@/app/providers/BotProvider';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/layout/LocaleSwitcher';
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

const getStatusMap = (
  t: any
): Record<string, { icon: string; color: string; label: string }> => ({
  completed: { icon: '✅', color: '#34C759', label: t('statusCompleted') },
  error: { icon: '❌', color: '#FF3B30', label: t('statusError') },
  processing: { icon: '⏳', color: '#FF9500', label: t('statusProcessing') },
});

export const Profile = () => {
  const t = useTranslations('Profile');
  const STATUS = getStatusMap(t);
  const router = useRouter();
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
  const { data: recurrentData } = useRecurrentStatus();
  const cancelRecurrent = useCancelRecurrent();

  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  const tokens = userData?.user?.tokens ?? 0;
  const isPremium = userData?.user?.premium ?? false;
  const premiumEnd = userData?.user?.premium_end;
  const requests = reqData?.pages.flatMap((p) => p) ?? [];
  const refStats = (refData as any)?.stats;
  const name = tgUser
    ? `${tgUser.first_name} ${tgUser.last_name || ''}`.trim()
    : t('user');
  const username = tgUser?.username || '';
  const userId = tgUser?.id;

  const referralLink =
    bot?.bot_username && userId
      ? `https://t.me/${bot.bot_username}?start=${userId}`
      : null;

  const PAYMENT_LINK_KEY = `payment_link_${bot?.bot_id || 'default'}`;

  const handleTopUp = async () => {
    haptic.medium();

    if (!bot?.bot_id) {
      toast.error(t('botNotDefined'));
      return;
    }

    try {
      const saved = localStorage.getItem(PAYMENT_LINK_KEY);
      if (saved) {
        window.open(saved, '_blank', 'noopener,noreferrer');
        return;
      }

      const { default: api } = await import('@/lib/api');
      const { data } = await api.get('/api/payment-link', {
        params: { bot_id: bot.bot_id },
      });

      if (data?.success && data?.url) {
        localStorage.setItem(PAYMENT_LINK_KEY, data.url);
        window.open(data.url, '_blank', 'noopener,noreferrer');
        return;
      }

      toast.error(t('paymentLinkUnavailable'));
    } catch (error) {
      toast.error(t('paymentLinkError'));
    }
  };

  const handleCopyToken = (token: string) => {
    haptic.success();
    navigator.clipboard.writeText(token).then(() => {
      setCopiedToken(token);
      toast.success(t('tokenCopied'));
      setTimeout(() => setCopiedToken(null), 2000);
    });
  };

  const handleCopyRef = () => {
    if (!referralLink) return;
    haptic.success();
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopiedRef(true);
      toast.success(t('refLinkCopied'));
      setTimeout(() => setCopiedRef(false), 2000);
    });
  };

  const handleGenerateToken = () => {
    haptic.light();
    generateToken.mutate(undefined, {
      onSuccess: (d) => {
        toast.success(t('newTokenCreated'));
        handleCopyToken(d.token);
      },
      onError: () => {
        haptic.error();
        toast.error(t('tokenCreateError'));
      },
    });
  };

  const handleCancelRecurrent = () => {
    haptic.warning();
    if (window.confirm(t('confirmCancelSubscription'))) {
      cancelRecurrent.mutate(undefined, {
        onSuccess: () => {
          toast.success(t('subscriptionCanceled'));
        },
        onError: () => {
          toast.error(t('subscriptionCancelError'));
        },
      });
    }
  };

  return (
    <div className="pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))] max-w-7xl mx-auto">
      {/* ── Nav Bar ── */}
      <header
        className={cn(
          'sticky top-0 z-40 flex items-center justify-between px-5 py-[14px]',
          'bg-white/4 dark:bg-black/35 backdrop-blur-2xl backdrop-saturate-150',
          'border-b border-white/10',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
        )}
      >
        <span className="text-[24px] font-bold tracking-[-0.5px]">
          {t('title')}
        </span>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
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
            {t('logout')}
          </button>
        </div>
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
                <p className="text-[20px] font-bold tracking-[-0.3px] truncate">
                  {name}
                </p>
                {isPremium && (
                  <div className="inline-flex items-center gap-[3px] px-2 py-[2px] rounded-full bg-[rgba(255,204,0,0.18)] border border-[rgba(255,204,0,0.30)] backdrop-blur-xl text-[12px] font-bold text-[#b38600] flex-shrink-0">
                    <Star size={9} fill="currentColor" />
                    Premium
                  </div>
                )}
              </div>
              {username && (
                <p className="text-[16px] text-white/50">@{username}</p>
              )}
              {isPremium && premiumEnd && (
                <p className="text-[14px] text-white/30 mt-0.5">
                  до{' '}
                  {new Date(premiumEnd * 1000).toLocaleDateString(
                    t('locale') === 'en' ? 'en-US' : 'ru-RU'
                  )}
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
            <span className="text-[12px] font-semibold tracking-[0.4px] uppercase text-white/50">
              {t('tokens')}
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
          <span className="text-[12px] font-semibold text-[#0A84FF]">
            {t('topUp')}
          </span>
        </button>

        {/* Referrals */}
        <button
          onClick={() => {
            haptic.light();
            router.push('/profile/referral');
          }}
          className={cn(
            'flex flex-col gap-1.5 p-[18px] rounded-[20px]',
            glassRegular,
            spring,
            'active:scale-[0.95] text-left transition-transform'
          )}
        >
          <div className="flex justify-between items-center">
            <span className="text-[12px] font-semibold tracking-[0.4px] uppercase text-white/50">
              {t('referrals')}
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
          <span className="text-[12px] text-white/50">
            {t('earned', {
              amount: refStats?.earned ?? refStats?.total_tokens ?? 0,
            })}
          </span>
        </button>
      </div>

      {/* ── Referral Link ── */}
      {referralLink && (
        <div className="px-5 pb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-bold tracking-[0.7px] uppercase text-white/50">
              {t('referralLink')}
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
          <p className="text-[12px] text-white/30 mt-2 px-1">
            {t('shareLink')}
          </p>
        </div>
      )}

      <div className="h-px bg-white/8 mb-5" />

      {/* ── API Tokens ── */}
      <div className="px-5 pb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] font-bold tracking-[0.7px] uppercase text-white/50">
            {t('apiTokens')}
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
            {t('createToken')}
          </button>
        </div>

        {!apiTokens || apiTokens.length === 0 ? (
          <p className="text-[14px] text-white/50 px-1">{t('noTokens')}</p>
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
                <span className="text-[12px] text-white/30 flex-shrink-0">
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

      {/* ── Recurrent Subscription ── */}
      {recurrentData?.recurrent && (
        <div className="px-5 pb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-bold tracking-[0.7px] uppercase text-white/50">
              {t('subscription')}
            </span>
          </div>
          <GlassCard className="p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#34C759]" />
                <span className="text-[14px] font-semibold">
                  {t('activeSubscription')}
                </span>
              </div>
              <button
                onClick={handleCancelRecurrent}
                disabled={cancelRecurrent.isPending}
                className={cn(
                  'px-3 py-1.5 rounded-full text-[12px] font-semibold',
                  'bg-[rgba(255,59,48,0.12)] text-[#FF3B30] border border-[rgba(255,59,48,0.22)]',
                  spring,
                  'active:scale-[0.95]',
                  cancelRecurrent.isPending && 'opacity-50'
                )}
              >
                {cancelRecurrent.isPending ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  t('cancelSubscription')
                )}
              </button>
            </div>
            <p className="text-[12px] text-white/40">{t('subscriptionInfo')}</p>
          </GlassCard>
        </div>
      )}

      <div className="h-px bg-white/8 mb-5" />

      {/* ── History ── */}
      <div className="px-5">
        <span className="block text-[12px] font-bold tracking-[0.7px] uppercase text-white/50 mb-3">
          {t('generationHistory')}
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
          <p className="text-[14px] text-white/50 py-4">{t('noGenerations')}</p>
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
                  className="flex items-center gap-3 pb-[14px] mb-[14px] border-b border-white/6"
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
                    <p className="text-[15px] font-semibold truncate">
                      {req.version}
                    </p>
                    <p className="text-[13px] text-white/50 mt-0.5">
                      {req.id} · {timeAgo(req.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-[3px] flex-shrink-0">
                    <span
                      className="text-[13px] font-semibold"
                      style={{ color: st.color }}
                    >
                      {st.label}
                    </span>
                    <span className="text-[14px] text-white/30">
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
                    {t('loading')}
                  </>
                ) : (
                  t('loadMore')
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
