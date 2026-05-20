'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useUser } from '@/hooks/useUser';
import { useRequests } from '@/hooks/useRequests';
import { useAuth } from '@/hooks/useAuth';
import {
  useReferrals,
  useApiTokens,
  useGenerateApiToken,
  usePaymentLink,
  useRecurrentStatus,
  useCancelRecurrent,
} from '@/hooks/useApiExtras';
import { useBot } from '@/app/providers/BotProvider';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/layout/LocaleSwitcher';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PaymentDialog } from '@/components/dialogs/PaymentDialog';
import {
  LogOut,
  Users,
  Star,
  Loader2,
  Key,
  Copy,
  Check,
  Link as LinkIcon,
  Zap,
  ChevronRight,
  Headset,
} from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import { toast } from 'sonner';
import { useHaptic } from '@/hooks/useHaptic';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type Tab = 'profile' | 'account' | 'partnership';

const getStatusMap = (t: ReturnType<typeof useTranslations<'Profile'>>) => ({
  completed: { color: '#22C55E', label: t('statusCompleted') },
  error: { color: '#EF4444', label: t('statusError') },
  processing: { color: '#F59E0B', label: t('statusProcessing') },
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
  const { data: paymentUrl } = usePaymentLink();
  const {
    data: reqData,
    isLoading: reqLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useRequests();
  const { data: recurrentData } = useRecurrentStatus();
  const cancelRecurrent = useCancelRecurrent();

  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  const tokens = userData?.user?.tokens ?? 0;
  const isPremium = userData?.user?.premium ?? false;
  const premiumEnd = userData?.user?.premium_end;
  const requests = reqData?.pages.flatMap((p) => p) ?? [];
  const refStats = (refData as any)?.stats;
  const name = tgUser ? `${tgUser.first_name} ${tgUser.last_name || ''}`.trim() : t('user');
  const username = tgUser?.username || '';
  const userId = tgUser?.id;

  const referralLink =
    bot?.bot_username && userId
      ? `https://t.me/${bot.bot_username}?start=${userId}`
      : null;

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
        onSuccess: () => toast.success(t('subscriptionCanceled')),
        onError: () => toast.error(t('subscriptionCancelError')),
      });
    }
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'profile', label: t('tabProfile') },
    { key: 'account', label: t('tabAccount') },
    { key: 'partnership', label: t('tabPartnership') },
  ];

  return (
    <div className="min-h-screen text-white pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))]">

      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-5 py-4 backdrop-blur-xl border-b border-white/[0.06]">
        <span className="text-[22px] font-medium tracking-tight">
          {t('title')}
        </span>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <button
            onClick={() => { haptic.heavy(); logout(); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/50 text-[13px] active:scale-95 transition-transform"
          >
            <LogOut size={13} />
            {t('logout')}
          </button>
        </div>
      </header>

      {/* Hero */}
      <div className="px-5 pt-8 pb-6">
        <div className="flex items-center gap-5">
          <div className="size-[72px] overflow-hidden shrink-0">
            <Avatar className="size-full">
              <AvatarImage src={tgUser?.photo_url} />
              <AvatarFallback className="text-[26px] font-medium bg-transparent">
                {name[0]}
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[22px] font-medium tracking-tight">{name}</p>
              {isPremium && (
                <span className="inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[11px] font-medium text-[#F59E0B]">
                  <Star size={9} fill="currentColor" /> Premium
                </span>
              )}
            </div>
            {username && <p className="text-[15px] text-white/40 mt-0.5">@{username}</p>}
            {isPremium && premiumEnd && (
              <p className="text-[12px] text-white/25 mt-0.5">
                до {new Date(premiumEnd * 1000).toLocaleDateString('ru-RU')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-[69px] z-30 px-5 pb-4 backdrop-blur-xl">
        <div className="flex gap-1 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { haptic.selection(); setActiveTab(tab.key); }}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 active:scale-95',
                activeTab === tab.key
                  ? 'bg-white/[0.10] text-white border border-white/[0.10]'
                  : 'text-white/35 hover:text-white/60'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB: Profile ── */}
      {activeTab === 'profile' && (
        <div className="px-5 flex flex-col gap-3">

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { haptic.medium(); if (paymentUrl) setIsPaymentOpen(true); }}
              className="flex flex-col gap-3 p-5 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-left active:scale-95 transition-transform"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-[0.5px] text-white/35">{t('tokens')}</span>
                <Zap size={13} className="text-white/25" />
              </div>
              {userLoading
                ? <div className="w-14 h-9 rounded-lg bg-white/[0.05] animate-pulse" />
                : <span className="text-[36px] font-medium tracking-tight leading-none">{Math.trunc(tokens)}</span>
              }
            </button>

            <button
              onClick={() => { haptic.light(); router.push('/profile/referral'); }}
              className="flex flex-col gap-3 p-5 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-left active:scale-95 transition-transform"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-[0.5px] text-white/35">{t('referrals')}</span>
                <Users size={13} className="text-white/25" />
              </div>
              {!refStats
                ? <div className="w-10 h-9 rounded-lg bg-white/[0.05] animate-pulse" />
                : <span className="text-[36px] font-medium tracking-tight leading-none">
                  {refStats?.total ?? refStats?.total_referrals ?? 0}
                </span>
              }
            </button>
          </div>

          {/* Top Up */}
          <button
            onClick={() => { haptic.medium(); if (paymentUrl) setIsPaymentOpen(true); }}
            className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] active:scale-[0.98] transition-transform"
          >
            <div className="size-10 rounded-xl bg-white/[0.07] flex items-center justify-center shrink-0">
              <Zap size={18} className="text-white/60" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[15px] font-medium">{t('topUpBalance')}</p>
            </div>
            <ChevronRight size={15} className="text-white/20" />
          </button>

          {/* Support */}
          <Link
            href="https://t.me/SibNeuroSupport"
            className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] active:scale-[0.98] transition-transform"
          >
            <div className="size-10 rounded-xl bg-white/[0.07] flex items-center justify-center shrink-0">
              <Headset size={18} className="text-white/60" />
            </div>
            <span className="text-[15px] font-medium flex-1">{t('support')}</span>
            <ChevronRight size={15} className="text-white/20" />
          </Link>

          {/* History */}
          <div className="mt-4">
            <p className="text-[11px] font-medium tracking-[0.5px] uppercase text-white/30 mb-4">
              {t('generationHistory')}
            </p>
            {reqLoading ? (
              <div className="flex flex-col gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 animate-pulse">
                    <div className="size-11 rounded-xl bg-white/[0.05] shrink-0" />
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="w-1/2 h-[14px] rounded bg-white/[0.05]" />
                      <div className="w-1/3 h-[11px] rounded bg-white/[0.05]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : requests.length === 0 ? (
              <p className="text-[15px] text-white/30">{t('noGenerations')}</p>
            ) : (
              <div className="flex flex-col">
                {requests.map((req) => {
                  const st = STATUS[req.status as keyof typeof STATUS] || { color: 'rgba(255,255,255,0.4)', label: req.status };
                  return (
                    <div key={req.id} className="flex items-center gap-4 py-4 border-b border-white/[0.05]">
                      <div className="size-11 rounded-xl bg-white/[0.05] shrink-0 flex items-center justify-center">
                        <div className="size-2 rounded-full" style={{ background: st.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-medium truncate">{req.version}</p>
                        <p className="text-[12px] text-white/35 mt-0.5">{timeAgo(req.created_at)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[13px] font-medium" style={{ color: st.color }}>{st.label}</p>
                        <p className="text-[12px] text-white/30 mt-0.5">{req.cost} 💎</p>
                      </div>
                    </div>
                  );
                })}
                {hasNextPage && (
                  <button
                    onClick={() => { haptic.light(); fetchNextPage(); }}
                    disabled={isFetchingNextPage}
                    className="w-full py-4 text-[14px] font-medium text-white/50 mt-2 active:scale-95 transition-transform flex items-center justify-center gap-2"
                  >
                    {isFetchingNextPage ? <><Loader2 size={14} className="animate-spin" />{t('loading')}</> : t('loadMore')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Account ── */}
      {activeTab === 'account' && (
        <div className="px-5 flex flex-col gap-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] font-medium tracking-[0.5px] uppercase text-white/30">{t('apiTokens')}</p>
              <button
                onClick={handleGenerateToken}
                disabled={generateToken.isPending}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-[12px] font-medium text-white/60 active:scale-95 transition-transform disabled:opacity-50"
              >
                {generateToken.isPending ? <Loader2 size={12} className="animate-spin" /> : <Key size={12} />}
                {t('createToken')}
              </button>
            </div>

            {!apiTokens || apiTokens.length === 0 ? (
              <p className="text-[15px] text-white/30">{t('noTokens')}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {apiTokens.map((tok: any) => (
                  <div key={tok.id} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                    <code className="flex-1 text-[12px] text-white/40 overflow-hidden text-ellipsis whitespace-nowrap font-mono">
                      {tok.token}
                    </code>
                    <span className="text-[12px] text-white/25 shrink-0">{tok.generations} reqs</span>
                    <button
                      onClick={() => handleCopyToken(tok.token)}
                      className="shrink-0 size-8 rounded-lg bg-white/[0.05] flex items-center justify-center active:scale-90 transition-transform"
                    >
                      {copiedToken === tok.token
                        ? <Check size={13} className="text-[#22C55E]" />
                        : <Copy size={13} className="text-white/35" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {recurrentData?.recurrent && (
            <div>
              <p className="text-[11px] font-medium tracking-[0.5px] uppercase text-white/30 mb-4">{t('subscription')}</p>
              <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="size-2 rounded-full bg-[#22C55E]" />
                    <span className="text-[15px] font-medium">{t('activeSubscription')}</span>
                  </div>
                  <button
                    onClick={handleCancelRecurrent}
                    disabled={cancelRecurrent.isPending}
                    className="px-3 py-2 rounded-xl text-[12px] font-medium text-[#EF4444] bg-[#EF4444]/[0.08] border border-[#EF4444]/[0.15] active:scale-95 transition-transform disabled:opacity-50"
                  >
                    {cancelRecurrent.isPending ? <Loader2 size={12} className="animate-spin" /> : t('cancelSubscription')}
                  </button>
                </div>
                <p className="text-[13px] text-white/30 leading-relaxed">{t('subscriptionInfo')}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Partnership ── */}
      {activeTab === 'partnership' && (
        <div className="px-5 flex flex-col gap-5">
          {referralLink && (
            <div>
              <p className="text-[11px] font-medium tracking-[0.5px] uppercase text-white/30 mb-4">{t('referralLink')}</p>
              <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                <span className="flex-1 text-[12px] text-white/45 overflow-hidden text-ellipsis whitespace-nowrap font-mono">
                  {referralLink}
                </span>
                <button
                  onClick={handleCopyRef}
                  className="shrink-0 size-8 rounded-lg bg-white/[0.05] flex items-center justify-center active:scale-90 transition-transform"
                >
                  {copiedRef ? <Check size={13} className="text-[#22C55E]" /> : <Copy size={13} className="text-white/35" />}
                </button>
              </div>
              <p className="text-[12px] text-white/25 mt-2 leading-relaxed">{t('shareLink')}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2 p-5 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
              <span className="text-[11px] font-medium uppercase tracking-[0.5px] text-white/35">{t('referrals')}</span>
              <span className="text-[36px] font-medium tracking-tight leading-none">
                {refStats?.total ?? refStats?.total_referrals ?? '—'}
              </span>
            </div>
            <div className="flex flex-col gap-2 p-5 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
              <span className="text-[11px] font-medium uppercase tracking-[0.5px] text-white/35">{t('earned')}</span>
              <div className="flex items-end gap-1.5">
                <span className="text-[36px] font-medium tracking-tight leading-none">
                  {refStats?.earned ?? '—'}
                </span>
                {refStats?.earned !== undefined && <span className="text-[18px] mb-1">💎</span>}
              </div>
            </div>
          </div>

          <button
            onClick={() => router.push('/profile/referral')}
            className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] active:scale-[0.98] transition-transform"
          >
            <div className="size-10 rounded-xl bg-white/[0.07] flex items-center justify-center shrink-0">
              <Users size={18} className="text-white/60" />
            </div>
            <span className="text-[15px] font-medium flex-1 text-left">{t('referralProgram')}</span>
            <ChevronRight size={15} className="text-white/20" />
          </button>
        </div>
      )}

      {paymentUrl && (
        <PaymentDialog url={paymentUrl} open={isPaymentOpen} onOpenChange={setIsPaymentOpen} />
      )}
    </div>
  );
};

export default Profile;