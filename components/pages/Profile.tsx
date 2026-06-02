'use client';

import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { useUser } from '@/hooks/useUser';
import { GenerationRequest, MediaItem, useRequests } from '@/hooks/useRequests';
import { useAuth } from '@/hooks/useAuth';
import {
  useReferrals,
  useApiTokens,
  useGenerateApiToken,
  useRecurrentStatus,
  useCancelRecurrent,
  useTrackingStats,
  useTrackingReferrals,
  useTrackingPayments,
  useTrackingPaymentsStats,
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
  Key,
  Copy,
  Check,
  Zap,
  ChevronRight,
  Headset,
  Gem,
  CheckCheck,
  Clock,
  X,
  TrendingUp,
  Activity,
  BarChart2,
  Languages,
  Coins,
  Repeat,
  Sparkles,
  UserPlus,
  CreditCard,
  Bot,
  ArrowUpRight,
  Globe,
  Link as LinkIcon,
  Calendar,
  ImageIcon,
  MessageSquare,
} from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import { toast } from 'sonner';
import { useHaptic } from '@/hooks/useHaptic';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type Tab = 'profile' | 'account' | 'partnership';
type PartnershipSubTab = 'overview' | 'finance' | 'audience' | 'lists';
type PartnershipPeriod = 'day' | 'week' | 'month' | 'all';
type ReferralsData = {
  stats?: {
    total?: number;
    total_referrals?: number;
    earned?: number;
    total_tokens?: number;
  };
  referrals?: any[];
  levelStats?: any[];
};
type ApiToken = {
  id: number;
  token: string;
  generations: number;
};

const STATUS_CONFIG = {
  completed: {
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.10)',
    border: 'rgba(34,197,94,0.18)',
    Icon: CheckCheck,
  },
  processing: {
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.10)',
    border: 'rgba(245,158,11,0.18)',
    Icon: Clock,
  },
  error: {
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.10)',
    border: 'rgba(239,68,68,0.18)',
    Icon: X,
  },
};


const spring =
  'transition-all duration-[280ms] [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]';

const glass = {
  panel:
    'rounded-[26px] border border-white/[0.10] bg-white/[0.055] backdrop-blur-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_4px_22px_rgba(0,0,0,0.25)]',
  tile: 'rounded-[22px] border border-white/[0.08] bg-white/[0.045] backdrop-blur-2xl',
  pill: 'rounded-full border border-cyan-400/20 bg-cyan-400/10 text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.14)]',
  cyanCard:
    'rounded-[22px] border border-cyan-400/15 bg-cyan-400/[0.06] backdrop-blur-2xl',
};

const getStatusMap = (t: ReturnType<typeof useTranslations<'Profile'>>) => ({
  completed: { color: '#22C55E', label: t('statusCompleted') },
  error: { color: '#EF4444', label: t('statusError') },
  processing: { color: '#F59E0B', label: t('statusProcessing') },
});



// Extract flat list of media from result
function extractResultMedia(result: GenerationRequest['result']): MediaItem[] {
  if (!result?.media) return [];
  return result.media.filter((m) => m?.input && typeof m.input === 'string');
}

// Extract input text preview
function extractInputText(inputs: GenerationRequest['inputs']): string | null {
  return inputs?.text || null;
}

// Detect if request has input images
function hasInputMedia(inputs: GenerationRequest['inputs']): boolean {
  return (inputs?.media?.length ?? 0) > 0;
}

// Get dominant media type for icon hint
function getMediaTypeLabel(items: MediaItem[]): string | null {
  if (!items.length) return null;
  const types = items.map((m) => m.type);
  if (types.includes('audio')) return 'audio';
  if (types.includes('image')) return 'image';
  return null;
}

function MediaPreviewStrip({ items }: { items: MediaItem[] }) {
  const images = items.filter((m) => m.type === 'image');
  const audio = items.filter((m) => m.type === 'audio');

  return (
    <div className="flex flex-col gap-2">
      {images.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {images.slice(0, 3).map((img, i) => (
            <div
              key={i}
              className="relative overflow-hidden rounded-[14px] border border-white/[0.08]"
              style={{ width: 72, height: 72 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.input}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              {images.length > 3 && i === 2 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[13px] font-semibold text-white">
                  +{images.length - 3}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {audio.map((aud, i) => (
        <audio
          key={i}
          src={aud.input}
          controls
          preload="none"
          className="w-full h-8 rounded-full"
          style={{ accentColor: '#22d3ee' }}
        />
      ))}
    </div>
  );
}

function InputPreview({ inputs }: { inputs: GenerationRequest['inputs'] }) {
  const text = extractInputText(inputs);
  const hasMedia = hasInputMedia(inputs);

  if (!text && !hasMedia) return null;

  return (
    <div className="flex items-center gap-1.5 text-[12px] text-white/30">
      {hasMedia && <ImageIcon size={11} className="shrink-0" />}
      {text && (
        <span className="truncate leading-snug">{text.slice(0, 80)}{text.length > 80 ? '…' : ''}</span>
      )}
      {!text && hasMedia && <span>Image input</span>}
    </div>
  );
}

function RequestCard({
  req,
  onNavigate,
}: {
  req: GenerationRequest;
  onNavigate: (id: string | number) => void;
}) {
  const st = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.error;

  const resultMedia = extractResultMedia(req.result);
  const image = resultMedia.find((m) => m.type === 'image');

  const prompt =
    req.inputs?.text ||
    req.result?.text?.slice(0, 140) ||
    'Image generation';

  if (!image) {
    return (
      <button
        onClick={() => onNavigate(req.dialogue_id)}
        className="group rounded-[24px] border border-white/[0.08] bg-white/[0.04] p-5 text-left"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold">{req.version}</p>
            <p className="text-xs text-white/40">
              {timeAgo(req.created_at)}
            </p>
          </div>

          <div
            className="px-2.5 py-1 rounded-full text-[11px] font-medium backdrop-blur-md"
            style={{
              background: st.bg,
              color: st.color,
              border: `1px solid ${st.border}`,
            }}
          >
            {req.status}
          </div>
        </div>

        <p className="text-sm text-white/80 line-clamp-3">
          {req.inputs?.text}
        </p>

        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <p className="text-sm text-white/45 line-clamp-4">
            {req.result?.text}
          </p>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={() => onNavigate(req.dialogue_id)}
      className={cn(
        'group relative overflow-hidden rounded-[24px]',
        'border border-white/[0.08]',
        'bg-white/[0.03]',
        'text-left',
        'hover:border-white/[0.15]',
        spring
      )}
    >
      {/* IMAGE */}
      {image ? (
        <div className="relative aspect-[4/5]">
          <img
            src={image.input}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/10" />
        </div>
      ) : (
        <div className="aspect-[4/5] bg-white/[0.04]" />
      )}

      {/* TOP */}
      <div className="absolute inset-x-0 top-0 p-4 flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {req.version}
          </p>

          <p className="text-xs text-white/60 mt-0.5">
            {timeAgo(req.created_at)}
          </p>
        </div>

        <div
          className="px-2.5 py-1 rounded-full text-[11px] font-medium backdrop-blur-md"
          style={{
            background: st.bg,
            color: st.color,
            border: `1px solid ${st.border}`,
          }}
        >
          {req.status}
        </div>
      </div>

      {/* BOTTOM */}
      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="text-sm text-white/90 line-clamp-3 leading-relaxed">
          {prompt}
        </p>
      </div>
    </button>
  );
}

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

  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [partnershipPeriod, setPartnershipPeriod] =
    useState<PartnershipPeriod>('all');
  const [partnershipTab, setPartnershipTab] =
    useState<PartnershipSubTab>('overview');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  const { data: trackingStatsData, isLoading: trackingStatsLoading } =
    useTrackingStats(partnershipPeriod);
  const { data: trackingReferralsData } = useTrackingReferrals(50, 0);
  const { data: trackingPaymentsData } = useTrackingPayments(partnershipPeriod);
  const { data: trackingPaymentsStatsData } =
    useTrackingPaymentsStats(partnershipPeriod);

  const tokens = userData?.user?.tokens ?? 0;
  const isPremium = userData?.user?.premium ?? false;
  const premiumEnd = userData?.user?.premium_end;
  const requests = reqData?.pages.flatMap((p) => p) ?? [];
  const refStats = (refData as ReferralsData | undefined)?.stats;
  const referralsList = (refData as ReferralsData | undefined)?.referrals ?? [];
  const levelStats = (refData as ReferralsData | undefined)?.levelStats ?? [];

  const name = tgUser
    ? `${tgUser.first_name} ${tgUser.last_name || ''}`.trim()
    : t('user');
  const username = tgUser?.username || '';
  const userId = tgUser?.id;
  const premiumEndDate = premiumEnd
    ? new Date(premiumEnd * 1000).toLocaleDateString()
    : null;

  const referralLink =
    bot?.bot_username && userId
      ? `https://t.me/${bot.bot_username}?start=${userId}`
      : null;

  // Tracking stats
  const stats = trackingStatsData || {};
  const usersStats = stats.users || {};
  const reqsStats = stats.reqs || {};
  const paysStats = stats.pays || {};
  const conversions = stats.conversionStats || {};
  const topModels = stats.topModels || [];
  const langStats = stats.langStats || [];
  const payLangs = stats.payLangs || [];
  const repeatPayments = stats.repeatPayments || {};
  const trialToPaid = stats.trialToPaid || {};
  const paymentsList = trackingPaymentsData?.rows || [];
  const payStatsAgg = trackingPaymentsStatsData || {};

  const totalTokens = useMemo(() => {
    const val = refStats?.total_tokens;
    if (typeof val === 'string') return parseInt(val, 10) || 0;
    return val || 0;
  }, [refStats?.total_tokens]);

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

  const handleNavigate = (dialogueId: string | number) => {
    haptic.light();
    router.push(`/chats/${dialogueId}`);
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'profile', label: t('tabProfile') },
    { key: 'account', label: t('tabAccount') },
    { key: 'partnership', label: t('tabPartnership') },
  ];

  const PARTNERSHIP_PERIODS: { key: PartnershipPeriod; label: string }[] = [
    { key: 'day', label: t('periodDay') },
    { key: 'week', label: t('periodWeek') },
    { key: 'month', label: t('periodMonth') },
    { key: 'all', label: t('periodAll') },
  ];

  const PARTNERSHIP_SUBTABS: { key: PartnershipSubTab; label: string }[] = [
    { key: 'overview', label: t('subTabOverview') },
    { key: 'finance', label: t('subTabFinance') },
    { key: 'audience', label: t('subTabAudience') },
    { key: 'lists', label: t('subTabLists') },
  ];

  return (
    <div className="min-h-svh overflow-x-hidden text-white pb-[calc(92px+max(16px,env(safe-area-inset-bottom)))]">
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-36 -left-24 h-[520px] w-[520px] rounded-full bg-cyan-500/5 blur-[120px]" />
        <div className="absolute top-24 right-[-120px] h-[460px] w-[460px] rounded-full bg-emerald-500/6 blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 h-[420px] w-[420px] rounded-full bg-sky-500/5 blur-[110px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(34,211,238,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,7,11,0.35),#05070b_72%)]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 px-5 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <h1 className="text-[30px] font-black tracking-tight bg-gradient-to-r from-cyan-200 via-sky-300 to-emerald-200 bg-clip-text text-transparent leading-tight">
            {t('title')}
          </h1>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button
              onClick={() => {
                haptic.heavy();
                logout();
              }}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold text-white/55 active:scale-95',
                'border border-white/[0.10] bg-white/[0.06] backdrop-blur-2xl',
                spring
              )}
            >
              <LogOut size={13} />
              {t('logout')}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 pt-6">
        {/* Hero */}
        <section className={cn(glass.panel, 'relative overflow-hidden p-5')}>
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent" />
          <div className="relative flex items-center gap-5">
            <Avatar className="size-[76px] shrink-0 rounded-full border border-white/[0.14] bg-white/[0.06]">
              <AvatarImage src={tgUser?.photo_url} />
              <AvatarFallback className="rounded-full bg-white/[0.08] text-[28px] font-black text-white">
                {name.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="truncate text-[24px] font-black tracking-tight">
                  {name}
                </p>
                {isPremium && (
                  <span
                    className={cn(
                      glass.pill,
                      'inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold'
                    )}
                  >
                    <Star size={10} fill="currentColor" /> {t('premium')}
                  </span>
                )}
              </div>
              {username && (
                <p className="mt-1 text-[14px] font-medium text-white/40">
                  @{username}
                </p>
              )}
              {isPremium && premiumEndDate && (
                <p className="mt-1 text-[12px] text-white/30">
                  {t('premiumUntil', { date: premiumEndDate })}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Tabs */}
        <div className="sticky top-[68px] z-30 -mx-5 px-5 pb-2">
          <div className="flex gap-1.5 p-1 rounded-full bg-white/[0.05] border border-white/[0.08]">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  haptic.selection();
                  setActiveTab(tab.key);
                }}
                className={cn(
                  'flex-1 py-2.5 rounded-full text-[13px] font-semibold active:scale-95',
                  spring,
                  activeTab === tab.key
                    ? glass.pill
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
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => router.push("/pay")}
                className={cn(
                  glass.tile,
                  'flex flex-col gap-3 p-5 text-left active:scale-95',
                  spring
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-[0.5px] text-white/35">
                    {t('tokens')}
                  </span>
                  <Zap size={13} className="text-cyan-200/55" />
                </div>
                {userLoading ? (
                  <div className="w-14 h-9 rounded-lg bg-white/[0.05] animate-pulse" />
                ) : (
                  <span className="text-[36px] font-black tracking-tight leading-none">
                    {Math.trunc(tokens)}
                  </span>
                )}
              </button>
            </div>

            {/* Top Up */}
            <button
              onClick={() => router.push("/pay")}
              className={cn(
                glass.tile,
                'flex items-center gap-4 px-5 py-4 active:scale-[0.98]',
                spring
              )}
            >
              <div className="size-10 rounded-2xl bg-cyan-400/10 border border-cyan-400/15 flex items-center justify-center shrink-0">
                <Zap size={18} className="text-cyan-200" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[15px] font-medium">{t('topUpBalance')}</p>
              </div>
              <ChevronRight size={15} className="text-white/20" />
            </button>

            {/* Support */}
            <Link
              href="https://t.me/SibNeuroSupport"
              className={cn(
                glass.tile,
                'flex items-center gap-4 px-5 py-4 active:scale-[0.98]',
                spring
              )}
            >
              <div className="size-10 rounded-2xl bg-white/[0.07] flex items-center justify-center shrink-0">
                <Headset size={18} className="text-white/60" />
              </div>
              <span className="text-[15px] font-medium flex-1">
                {t('support')}
              </span>
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
                    <div
                      key={i}
                      className="flex items-center gap-4 animate-pulse"
                    >
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
                <div className="flex flex-col gap-3">
                  {requests.map((req) => (
                    <RequestCard key={req.id} req={req} onNavigate={handleNavigate} />
                  ))}

                  {hasNextPage && (
                    <button
                      onClick={() => {
                        haptic.light();
                        fetchNextPage?.();
                      }}
                      disabled={isFetchingNextPage}
                      className={cn(
                        'w-full py-3.5 rounded-[16px] text-[13px] font-medium text-white/40',
                        'border border-white/[0.06] bg-white/[0.025]',
                        'flex items-center justify-center gap-2',
                        'hover:text-white/60 hover:border-white/[0.10]',
                        'active:scale-[0.98] disabled:opacity-50',
                        spring
                      )}
                    >
                      {isFetchingNextPage ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          Loading…
                        </>
                      ) : (
                        'Load more'
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: Account ── */}
        {activeTab === 'account' && (
          <div className="flex flex-col gap-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-medium tracking-[0.5px] uppercase text-white/30">
                  {t('apiTokens')}
                </p>
                <button
                  onClick={handleGenerateToken}
                  disabled={generateToken.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-[12px] font-medium text-white/60 active:scale-95 transition-transform disabled:opacity-50"
                >
                  {generateToken.isPending ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Key size={12} />
                  )}
                  {t('createToken')}
                </button>
              </div>

              {!apiTokens || apiTokens.length === 0 ? (
                <p className="text-[15px] text-white/30">{t('noTokens')}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {(apiTokens as ApiToken[]).map((tok) => (
                    <div
                      key={tok.id}
                      className={cn(
                        glass.tile,
                        'flex items-center gap-3 px-4 py-3.5'
                      )}
                    >
                      <code className="flex-1 text-[12px] text-white/40 overflow-hidden text-ellipsis whitespace-nowrap font-mono">
                        {tok.token}
                      </code>
                      <span className="text-[12px] text-white/25 shrink-0">
                        {t('requestsShort', { count: tok.generations })}
                      </span>
                      <button
                        onClick={() => handleCopyToken(tok.token)}
                        className="shrink-0 size-8 rounded-lg bg-white/[0.05] flex items-center justify-center active:scale-90 transition-transform"
                      >
                        {copiedToken === tok.token ? (
                          <Check size={13} className="text-[#22C55E]" />
                        ) : (
                          <Copy size={13} className="text-white/35" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {recurrentData?.recurrent && (
              <div>
                <p className="text-[11px] font-medium tracking-[0.5px] uppercase text-white/30 mb-4">
                  {t('subscription')}
                </p>
                <div className={cn(glass.tile, 'p-5')}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="size-2 rounded-full bg-[#22C55E]" />
                      <span className="text-[15px] font-medium">
                        {t('activeSubscription')}
                      </span>
                    </div>
                    <button
                      onClick={handleCancelRecurrent}
                      disabled={cancelRecurrent.isPending}
                      className="px-3 py-2 rounded-xl text-[12px] font-medium text-[#EF4444] bg-[#EF4444]/[0.08] border border-[#EF4444]/[0.15] active:scale-95 transition-transform disabled:opacity-50"
                    >
                      {cancelRecurrent.isPending ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        t('cancelSubscription')
                      )}
                    </button>
                  </div>
                  <p className="text-[13px] text-white/30 leading-relaxed">
                    {t('subscriptionInfo')}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Partnership ── */}
        {activeTab === 'partnership' && (
          <div className="flex flex-col gap-5">
            {/* Hero Banner */}
            <div
              className={cn(
                glass.panel,
                'relative overflow-hidden p-6'
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/15 via-sky-500/8 to-transparent" />
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
              <div className="absolute top-0 right-0 p-6 opacity-[0.06] translate-x-4 -translate-y-2 pointer-events-none">
                <Users size={120} className="text-cyan-200" />
              </div>
              <div className="relative flex gap-4">
                <div className="size-12 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center shrink-0">
                  <Users size={22} className="text-cyan-300" />
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-[14px] text-white/75 leading-relaxed">
                    {t('partnershipDesc')}
                  </p>
                  <p className="text-[12px] text-white/40 leading-relaxed">
                    {t('rewardDesc')}
                  </p>
                </div>
              </div>
            </div>

            {/* Referral Link */}
            {referralLink && (
              <div>
                <p className="text-[11px] font-medium tracking-[0.5px] uppercase text-white/30 mb-3">
                  {t('referralLink')}
                </p>
                <div
                  className={cn(
                    glass.tile,
                    'flex items-center gap-3 px-4 py-3.5'
                  )}
                >
                  <LinkIcon size={14} className="text-cyan-400/50 shrink-0" />
                  <span className="flex-1 text-[12px] text-white/45 overflow-hidden text-ellipsis whitespace-nowrap font-mono">
                    {referralLink}
                  </span>
                  <button
                    onClick={handleCopyRef}
                    className="shrink-0 size-8 rounded-lg bg-white/[0.05] flex items-center justify-center active:scale-90 transition-transform"
                  >
                    {copiedRef ? (
                      <Check size={13} className="text-[#22C55E]" />
                    ) : (
                      <Copy size={13} className="text-white/35" />
                    )}
                  </button>
                </div>
                <p className="text-[12px] text-white/25 mt-2 leading-relaxed">
                  {t('shareLink')}
                </p>
              </div>
            )}

            {/* Level breakdown from referral page */}
            {levelStats.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((lvl) => {
                  const found = levelStats.find((l: any) => l.level === lvl);
                  return (
                    <div key={lvl} className={cn(glass.tile, 'flex flex-col gap-1.5 p-4')}>
                      <span className="text-[10px] font-medium uppercase tracking-[0.5px] text-white/30">
                        {t('levelN', { n: lvl })}
                      </span>
                      <span className="text-[22px] font-black tracking-tight leading-none">
                        {found?.count ?? 0}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Dashboard Controls */}
            <div className="flex flex-col gap-3 pt-2">
              {/* Period selector */}
              <div className="flex gap-1 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                {PARTNERSHIP_PERIODS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => {
                      haptic.light();
                      setPartnershipPeriod(p.key);
                    }}
                    className={cn(
                      'flex-1 py-2 rounded-xl text-[12px] font-semibold active:scale-95',
                      spring,
                      partnershipPeriod === p.key
                        ? glass.pill
                        : 'text-white/30 hover:text-white/55'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Sub-tab switcher */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {PARTNERSHIP_SUBTABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      haptic.light();
                      setPartnershipTab(tab.key);
                    }}
                    className={cn(
                      'px-4 py-2 rounded-full text-[12px] font-semibold shrink-0 border',
                      spring,
                      partnershipTab === tab.key
                        ? glass.pill
                        : 'border-white/[0.06] bg-white/[0.03] text-white/35 hover:text-white/55'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {trackingStatsLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4 opacity-50">
                <Loader2 size={28} className="animate-spin text-cyan-400" />
                <p className="text-[13px] text-white/40 uppercase tracking-widest">
                  {t('loading')}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* ── Sub-tab: Overview ── */}
                {partnershipTab === 'overview' && (
                  <div className="flex flex-col gap-4">
                    {/* KPI Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Users */}
                      <div className={cn(glass.tile, 'flex flex-col justify-between p-5 gap-3')}>
                        <div className="flex items-center justify-between text-white/30">
                          <span className="text-[10px] font-medium uppercase tracking-[0.5px] flex items-center gap-1.5">
                            <Users size={11} /> {t('metricUsers')}
                          </span>
                          <ArrowUpRight size={13} className="opacity-40" />
                        </div>
                        <div>
                          <p className="text-[30px] font-black leading-none tracking-tight">
                            {usersStats.total ?? 0}
                          </p>
                          <p className="text-[11px] text-emerald-400/80 font-medium mt-1.5">
                            {t('metricNewUsers', { count: usersStats.new ?? 0 })}
                          </p>
                        </div>
                      </div>

                      {/* Revenue */}
                      <div className={cn(glass.cyanCard, 'flex flex-col justify-between p-5 gap-3')}>
                        <div className="flex items-center justify-between text-white/30">
                          <span className="text-[10px] font-medium uppercase tracking-[0.5px] flex items-center gap-1.5">
                            <Coins size={11} /> {t('metricRevenue')}
                          </span>
                          <ArrowUpRight size={13} className="opacity-40" />
                        </div>
                        <div>
                          <p className="text-[30px] font-black text-cyan-200 leading-none tracking-tight">
                            {paysStats.totalRevenue ?? 0}{' '}
                            <span className="text-[16px] text-white/30">◈</span>
                          </p>
                          <p className="text-[11px] text-white/35 font-medium mt-1.5">
                            {t('metricSuccessfulPays', {
                              count: paysStats.successCount ?? 0,
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Requests */}
                      <div className={cn(glass.tile, 'flex flex-col justify-between p-5 gap-3')}>
                        <div className="flex items-center justify-between text-white/30">
                          <span className="text-[10px] font-medium uppercase tracking-[0.5px] flex items-center gap-1.5">
                            <Zap size={11} /> {t('metricRequests')}
                          </span>
                          <ArrowUpRight size={13} className="opacity-40" />
                        </div>
                        <div>
                          <p className="text-[30px] font-black leading-none tracking-tight">
                            {reqsStats.total ?? 0}
                          </p>
                          <p className="text-[11px] text-white/35 font-medium mt-1.5">
                            {t('metricActiveUsers', {
                              count: reqsStats.uniqueUsers ?? 0,
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Conversion */}
                      <div className={cn(glass.tile, 'flex flex-col justify-between p-5 gap-3')}>
                        <div className="flex items-center justify-between text-white/30">
                          <span className="text-[10px] font-medium uppercase tracking-[0.5px] flex items-center gap-1.5">
                            <TrendingUp size={11} /> {t('metricConversion')}
                          </span>
                          <ArrowUpRight size={13} className="opacity-40" />
                        </div>
                        <div>
                          <p className="text-[30px] font-black leading-none tracking-tight">
                            {conversions.rate ?? 0}%
                          </p>
                          <p className="text-[11px] text-white/35 font-medium mt-1.5">
                            {t('metricBuyers', {
                              count: conversions.uniquePayers ?? 0,
                            })}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Performance Funnels */}
                    <div className={cn(glass.tile, 'p-5 flex flex-col gap-5')}>
                      <p className="text-[11px] font-medium tracking-[0.5px] uppercase text-white/30">
                        {t('funnels')}
                      </p>

                      {[
                        {
                          icon: <Star size={11} className="text-amber-300" fill="currentColor" />,
                          label: t('cardPremium'),
                          value: `${usersStats.premium ?? 0} / ${usersStats.total ?? 0}`,
                          pct: usersStats.total > 0
                            ? (usersStats.premium / usersStats.total) * 100
                            : 0,
                          bar: 'bg-amber-400/70',
                        },
                        {
                          icon: <Globe size={11} className="text-sky-300" />,
                          label: t('cardTgTraffic'),
                          value: `${usersStats.tg ?? 0} / ${usersStats.total ?? 0}`,
                          pct: usersStats.total > 0
                            ? (usersStats.tg / usersStats.total) * 100
                            : 0,
                          bar: 'bg-sky-400/70',
                        },
                        {
                          icon: <Repeat size={11} className="text-emerald-300" />,
                          label: t('cardRepeatPayments'),
                          value: `${repeatPayments.repeatPayersCount ?? 0}`,
                          pct: paysStats.successCount > 0
                            ? ((repeatPayments.repeatPayersCount || 0) /
                              paysStats.successCount) * 100
                            : 0,
                          bar: 'bg-emerald- 400/70',
                        },
                        {
                          icon: <Sparkles size={11} className="text-indigo-300" />,
                          label: t('cardTrialToPaid'),
                          value: `${trialToPaid.rate ?? 0}%`,
                          pct: trialToPaid.rate ?? 0,
                          bar: 'bg-indigo-400/70',
                        },
                      ].map((item, i) => (
                        <div key={i}>
                          <div className="flex justify-between items-center text-[12px] font-medium mb-2">
                            <span className="text-white/55 flex items-center gap-1.5">
                              {item.icon}
                              {item.label}
                            </span>
                            <span className="text-white/70">{item.value}</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                item.bar,
                                spring
                              )}
                              style={{ width: `${Math.min(item.pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Sub-tab: Finance ── */}
                {partnershipTab === 'finance' && (
                  <div className="flex flex-col gap-4">
                    {/* Revenue bar chart */}
                    {(() => {
                      const dailyPays =
                        paysStats.daily || payStatsAgg.daily || [];
                      const maxRev =
                        dailyPays.length > 0
                          ? Math.max(
                            ...dailyPays.map((d: any) => d.revenue || 0)
                          )
                          : 0;
                      return (
                        <div
                          className={cn(glass.tile, 'p-5 flex flex-col gap-4')}
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] font-medium uppercase tracking-[0.5px] text-white/30 flex items-center gap-1.5">
                              <Activity size={11} className="text-cyan-400" />{' '}
                              {t('financeRevenueTrend')}
                            </p>
                            {paysStats.totalRevenue > 0 && (
                              <span className="text-[11px] text-white/40 font-medium">
                                {paysStats.totalRevenue} ◈
                              </span>
                            )}
                          </div>
                          {dailyPays.length > 0 ? (
                            <div className="flex items-end justify-between gap-1 h-28">
                              {dailyPays.slice(-14).map((d: any, idx: number) => {
                                const pct =
                                  maxRev > 0
                                    ? ((d.revenue || 0) / maxRev) * 100
                                    : 0;
                                return (
                                  <div
                                    key={idx}
                                    className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group/bar"
                                  >
                                    <div
                                      style={{ height: `${Math.max(pct, 5)}%` }}
                                      className="w-full rounded-t-[3px] bg-gradient-to-t from-cyan-500/60 to-cyan-300/80 group-hover/bar:from-cyan-400/80 group-hover/bar:to-cyan-200 transition-all duration-200"
                                    />
                                    <span className="text-[8px] font-medium text-white/20 truncate max-w-full">
                                      {d.date
                                        ? d.date.split('-').slice(2).join('/')
                                        : idx + 1}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="h-28 flex items-center justify-center text-white/20">
                              <p className="text-[12px]">{t('noData')}</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Status breakdown */}
                    {(() => {
                      const allStatuses =
                        paysStats.allStatuses || payStatsAgg.allStatuses || [];
                      return (
                        <div className={cn(glass.tile, 'p-5 flex flex-col gap-4')}>
                          <p className="text-[11px] font-medium uppercase tracking-[0.5px] text-white/30 flex items-center gap-1.5">
                            <CreditCard size={11} />{' '}
                            {t('financeStatusBreakdown')}
                          </p>
                          {allStatuses.length > 0 ? (
                            <div className="flex flex-col gap-3">
                              {allStatuses.map((st: any, i: number) => {
                                const isSuccess =
                                  st.status === 'successful' ||
                                  st.status === 'success';
                                const isRefunded = st.status === 'refunded';
                                const maxRev = Math.max(
                                  ...allStatuses.map(
                                    (x: any) => x.revenue || 1
                                  )
                                );
                                const pct =
                                  maxRev > 0
                                    ? ((st.revenue || 0) / maxRev) * 100
                                    : 0;
                                const color = isSuccess
                                  ? 'bg-emerald-400/70'
                                  : isRefunded
                                    ? 'bg-amber-400/70'
                                    : 'bg-red-400/60';
                                const dotColor = isSuccess
                                  ? 'bg-emerald-400'
                                  : isRefunded
                                    ? 'bg-amber-400'
                                    : 'bg-red-400';
                                return (
                                  <div key={i} className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between text-[12px]">
                                      <span className="text-white/55 flex items-center gap-1.5">
                                        <div
                                          className={cn(
                                            'size-2 rounded-full',
                                            dotColor
                                          )}
                                        />
                                        <span className="capitalize">
                                          {st.status}
                                        </span>
                                      </span>
                                      <span className="text-white/70 font-medium">
                                        {st.revenue ?? 0} ◈{' '}
                                        <span className="text-white/30">
                                          ({st.count})
                                        </span>
                                      </span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                                      <div
                                        className={cn(
                                          'h-full rounded-full',
                                          color,
                                          spring
                                        )}
                                        style={{
                                          width: `${Math.max(pct, 3)}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-[12px] text-white/20">
                              {t('noData')}
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Currency breakdown */}
                    {payLangs.length > 0 && (
                      <div className={cn(glass.tile, 'p-5 flex flex-col gap-4')}>
                        <p className="text-[11px] font-medium uppercase tracking-[0.5px] text-white/30 flex items-center gap-1.5">
                          <Globe size={11} /> {t('financeCurrencyBreakdown')}
                        </p>
                        <div className="flex flex-col gap-3">
                          {payLangs.map((pl: any, i: number) => {
                            const maxAmt = Math.max(
                              ...payLangs.map((x: any) => x.total_amount || 1)
                            );
                            const pct =
                              maxAmt > 0
                                ? ((pl.total_amount || 0) / maxAmt) * 100
                                : 0;
                            return (
                              <div key={i} className="flex flex-col gap-2">
                                <div className="flex items-center justify-between text-[12px]">
                                  <span className="text-white/55 font-medium uppercase">
                                    {pl.currency || 'USD'}
                                  </span>
                                  <span className="text-white/40 font-mono text-[11px]">
                                    {pl.total_amount} {pl.currency} · {pl.count}
                                  </span>
                                </div>
                                <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                                  <div
                                    className={cn(
                                      'h-full rounded-full bg-gradient-to-r from-indigo-400/70 to-purple-400/70',
                                      spring
                                    )}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Sub-tab: Audience ── */}
                {partnershipTab === 'audience' && (
                  <div className="flex flex-col gap-4">
                    {/* Activity bar chart */}
                    {(() => {
                      const dailyAct = stats.activity || [];
                      const maxAct =
                        dailyAct.length > 0
                          ? Math.max(
                            ...dailyAct.map(
                              (d: any) => d.unique_users || 0
                            )
                          )
                          : 0;
                      return (
                        <div
                          className={cn(glass.tile, 'p-5 flex flex-col gap-4')}
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] font-medium uppercase tracking-[0.5px] text-white/30 flex items-center gap-1.5">
                              <Activity size={11} className="text-amber-400" />{' '}
                              {t('audienceActivityTrend')}
                            </p>
                            {usersStats.total > 0 && (
                              <span className="text-[11px] text-white/40">
                                {usersStats.total} {t('metricUsers').toLowerCase()}
                              </span>
                            )}
                          </div>
                          {dailyAct.length > 0 ? (
                            <div className="flex items-end justify-between gap-1 h-28">
                              {dailyAct.slice(-14).map((d: any, idx: number) => {
                                const pct =
                                  maxAct > 0
                                    ? ((d.unique_users || 0) / maxAct) * 100
                                    : 0;
                                return (
                                  <div
                                    key={idx}
                                    className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group/bar"
                                  >
                                    <div
                                      style={{ height: `${Math.max(pct, 5)}%` }}
                                      className="w-full rounded-t-[3px] bg-gradient-to-t from-amber-500/60 to-amber-300/80 group-hover/bar:brightness-125 transition-all duration-200"
                                    />
                                    <span className="text-[8px] font-medium text-white/20 truncate max-w-full">
                                      {d.date
                                        ? d.date.split('-').slice(2).join('/')
                                        : idx + 1}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="h-28 flex items-center justify-center text-white/20">
                              <p className="text-[12px]">{t('noData')}</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Bot distribution */}
                    {(() => {
                      const byBot = usersStats.byBot || [];
                      return byBot.length > 0 ? (
                        <div className={cn(glass.tile, 'p-5 flex flex-col gap-4')}>
                          <p className="text-[11px] font-medium uppercase tracking-[0.5px] text-white/30 flex items-center gap-1.5">
                            <Bot size={11} /> {t('audienceBotBreakdown')}
                          </p>
                          <div className="flex flex-col gap-3">
                            {byBot.map((b: any, i: number) => {
                              const maxCnt = Math.max(
                                ...byBot.map((x: any) => x.count || 1)
                              );
                              const pct =
                                maxCnt > 0
                                  ? ((b.count || 0) / maxCnt) * 100
                                  : 0;
                              return (
                                <div key={i} className="flex flex-col gap-2">
                                  <div className="flex items-center justify-between text-[12px]">
                                    <span className="text-cyan-300 font-medium">
                                      @{b.bot_username}
                                    </span>
                                    <span className="text-white/40">
                                      {b.count}
                                    </span>
                                  </div>
                                  <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        'h-full rounded-full bg-gradient-to-r from-sky-400/70 to-cyan-400/70',
                                        spring
                                      )}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {/* Models + Languages */}
                    <div className="grid grid-cols-1 gap-4">
                      {topModels.length > 0 && (
                        <div className={cn(glass.tile, 'p-5 flex flex-col gap-4')}>
                          <p className="text-[11px] font-medium uppercase tracking-[0.5px] text-white/30 flex items-center gap-1.5">
                            <BarChart2 size={11} /> {t('audienceTopModels')}
                          </p>
                          <div className="flex flex-col gap-3">
                            {topModels.map((m: any, i: number) => {
                              const maxCnt = Math.max(
                                ...topModels.map((x: any) => x.count || 1)
                              );
                              const pct =
                                maxCnt > 0
                                  ? ((m.count || 0) / maxCnt) * 100
                                  : 0;
                              return (
                                <div key={i} className="flex flex-col gap-1.5">
                                  <div className="flex items-center justify-between text-[12px]">
                                    <span className="text-white/60">{m.model}</span>
                                    <span className="text-white/35">{m.count}</span>
                                  </div>
                                  <div className="h-1 w-full bg-white/[0.05] rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-amber-400/60 to-cyan-400/60"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {langStats.length > 0 && (
                        <div className={cn(glass.tile, 'p-5 flex flex-col gap-4')}>
                          <p className="text-[11px] font-medium uppercase tracking-[0.5px] text-white/30 flex items-center gap-1.5">
                            <Languages size={11} /> {t('audienceLanguages')}
                          </p>
                          <div className="flex flex-col gap-3">
                            {langStats.map((l: any, i: number) => {
                              const maxCnt = Math.max(
                                ...langStats.map((x: any) => x.count || 1)
                              );
                              const pct =
                                maxCnt > 0
                                  ? ((l.count || 0) / maxCnt) * 100
                                  : 0;
                              return (
                                <div key={i} className="flex flex-col gap-1.5">
                                  <div className="flex items-center justify-between text-[12px]">
                                    <span className="text-white/60 uppercase">
                                      {l.lang}
                                    </span>
                                    <span className="text-white/35">
                                      {l.count}
                                    </span>
                                  </div>
                                  <div className="h-1 w-full bg-white/[0.05] rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-purple-400/60 to-pink-400/60"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Sub-tab: Lists ── */}
                {partnershipTab === 'lists' && (
                  <div className="flex flex-col gap-5">
                    {/* Referrals list */}
                    <div>
                      <p className="text-[11px] font-medium tracking-[0.5px] uppercase text-white/30 mb-3 flex items-center gap-1.5">
                        <UserPlus size={11} /> {t('listLastReferrals')}
                      </p>

                      {/* Header */}
                      <div className="grid grid-cols-3 px-2 mb-2 text-[11px] font-medium text-white/25 uppercase tracking-[0.5px]">
                        <span>{t('level')}</span>
                        <span className="text-center">{t('payments')}</span>
                        <span className="text-right">{t('regDate')}</span>
                      </div>

                      <div className="flex flex-col">
                        {referralsList.length > 0 ? (
                          referralsList.map((ref: any, idx: number) => (
                            <div
                              key={idx}
                              className="grid grid-cols-3 py-3.5 items-center border-b border-white/[0.05]"
                            >
                              <div className="flex items-center gap-3">
                                <div className="size-8 rounded-xl bg-white/[0.05] flex items-center justify-center text-[11px] font-bold text-white/50">
                                  {ref.level}
                                </div>
                                <span className="text-[13px] font-medium truncate text-white/80">
                                  {ref.first_name ||
                                    ref.username ||
                                    `#${ref.user_id}`}
                                </span>
                              </div>
                              <div className="text-center text-[13px] font-bold text-cyan-300/80">
                                {ref.tokens_earned || 0}{' '}
                                <Gem className="size-3 inline text-cyan-400/50" />
                              </div>
                              <div className="text-right text-[11px] text-white/30">
                                {ref.created_at
                                  ? new Date(
                                    ref.created_at
                                  ).toLocaleDateString()
                                  : '—'}
                              </div>
                            </div>
                          ))
                        ) : (
                          // Fallback to trackingReferrals if refData empty
                          (trackingReferralsData?.rows || []).length > 0 ? (
                            (trackingReferralsData?.rows || []).map(
                              (ref: any, i: number) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between py-3.5 border-b border-white/[0.05]"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="size-9 rounded-xl bg-white/[0.05] flex items-center justify-center text-[13px] font-bold text-white/50">
                                      {ref.user?.first_name?.[0]?.toUpperCase() ||
                                        '?'}
                                    </div>
                                    <div>
                                      <p className="text-[13px] font-medium text-white/80">
                                        {ref.user?.first_name || t('listNameUnknown')}{' '}
                                        {ref.user?.last_name || ''}
                                      </p>
                                      {ref.user?.username && (
                                        <p className="text-[11px] text-cyan-400/70 mt-0.5">
                                          @{ref.user.username}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <span className="text-[11px] text-white/20">
                                    #{ref.user_id}
                                  </span>
                                </div>
                              )
                            )
                          ) : (
                            <div className="py-10 flex flex-col items-center gap-3 opacity-25">
                              <Calendar size={28} />
                              <p className="text-[14px]">{t('noData')}</p>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    {/* Payments list */}
                    <div>
                      <p className="text-[11px] font-medium tracking-[0.5px] uppercase text-white/30 mb-3 flex items-center gap-1.5">
                        <Coins size={11} /> {t('listLastPayments')}
                      </p>
                      <div className="flex flex-col">
                        {paymentsList.length > 0 ? (
                          paymentsList.map((pay: any, i: number) => {
                            const isSuccess =
                              pay.status === 'successful' ||
                              pay.status === 'success';
                            return (
                              <div
                                key={i}
                                className="flex items-center gap-4 py-3.5 border-b border-white/[0.05]"
                              >
                                <div
                                  className={cn(
                                    'size-10 rounded-xl flex items-center justify-center shrink-0',
                                    isSuccess
                                      ? 'bg-emerald-400/10 text-emerald-400'
                                      : pay.status === 'refunded'
                                        ? 'bg-amber-400/10 text-amber-400'
                                        : 'bg-white/[0.05] text-white/30'
                                  )}
                                >
                                  {isSuccess ? (
                                    <CheckCheck size={16} />
                                  ) : (
                                    <Clock size={16} />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[14px] font-medium text-white/80">
                                    {pay.amount} {pay.currency || '◈'}
                                  </p>
                                  <p className="text-[11px] text-white/35 mt-0.5">
                                    {pay.user?.first_name || t('listUser')}
                                    {pay.bot_username && (
                                      <span className="ml-1.5 text-cyan-400/60">
                                        @{pay.bot_username}
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-[11px] text-white/25">
                                    {new Date(
                                      pay.created_at
                                    ).toLocaleDateString()}
                                  </p>
                                  <p
                                    className={cn(
                                      'text-[10px] font-medium mt-0.5 capitalize',
                                      isSuccess
                                        ? 'text-emerald-400/70'
                                        : pay.status === 'refunded'
                                          ? 'text-amber-400/70'
                                          : 'text-white/30'
                                    )}
                                  >
                                    {pay.status}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="py-10 flex flex-col items-center gap-3 opacity-25">
                            <Coins size={28} />
                            <p className="text-[14px]">{t('noData')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Profile;