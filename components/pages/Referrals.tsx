'use client';

import { useRouter } from 'next/navigation';
import { useReferrals } from '@/hooks/useApiExtras';
import { useHaptic } from '@/hooks/useHaptic';
import { useAuth } from '@/hooks/useAuth';
import { useBot } from '@/app/providers/BotProvider';
import {
  ChevronLeft,
  Copy,
  Check,
  Loader2,
  Users,
  CreditCard,
  Calendar,
  Link as LinkIcon,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

/* ── Redesigned Glass Styles (Syntx Inspired) ── */
const glassCard = cn(
  'bg-[#0A0A0A]/60 backdrop-blur-3xl',
  'border border-white/5',
  'shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
);

const blueGlow = cn(
  'border-[rgba(0,122,255,0.25)]',
  'shadow-[0_0_30px_rgba(0,122,255,0.08),inset_0_1px_0_rgba(255,255,255,0.05)]'
);

const spring =
  'transition-all duration-[240ms] [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]';

export const Referrals = () => {
  const t = useTranslations('Referrals');
  const tp = useTranslations('Profile');
  const router = useRouter();
  const haptic = useHaptic();
  const { user: tgUser } = useAuth();
  const { bot } = useBot();
  const { data: refData, isLoading } = useReferrals();
  const [copiedRef, setCopiedRef] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);

  const stats = (refData as any)?.stats || {};
  const referrals = (refData as any)?.referrals || [];
  const levelStats = (refData as any)?.levelStats || [];

  const userId = tgUser?.id;
  const referralLink =
    bot?.bot_username && userId
      ? `https://t.me/${bot.bot_username}?start=${userId}`
      : null;

  const handleCopyRef = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      haptic.success();
      setCopiedRef(true);
      toast.success(t('linkCopied'));
      setTimeout(() => setCopiedRef(false), 2000);
    });
  };

  const totalTokens = useMemo(() => {
    const val = stats.total_tokens;
    if (typeof val === 'string') return parseInt(val, 10) || 0;
    return val || 0;
  }, [stats.total_tokens]);

  return (
    <div className="flex flex-col min-h-svh bg-[#050505] text-white selection:bg-[#007AFF]/30">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 px-6 py-5 flex items-center gap-4 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
        <button
          onClick={() => {
            haptic.light();
            router.back();
          }}
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10',
            spring,
            'active:scale-[0.92] hover:bg-white/10'
          )}
        >
          <ChevronLeft size={20} className="text-[#007AFF]" />
        </button>
        <h1 className="text-2xl font-black tracking-[-1px] uppercase">
          {t('title')}
        </h1>
      </header>

      <div className="flex-1 max-w-[800px] mx-auto w-full px-5 py-6 flex flex-col gap-6">
        {/* ── Info Box (Partnership description) ── */}
        <div
          className={cn(
            'p-6 rounded-[24px] relative overflow-hidden',
            glassCard,
            blueGlow
          )}
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#007AFF] to-transparent opacity-50" />
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#007AFF]/10 border border-[#007AFF]/20 flex items-center justify-center shrink-0">
              <Users size={22} className="text-[#007AFF]" />
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-[14px] text-white/80 leading-[1.6]">
                {tp('partnershipDesc')}
              </p>
              <p className="text-[13px] font-medium text-white/50 leading-[1.5]">
                {tp('rewardDesc')}
              </p>
            </div>
          </div>
        </div>

        {/* ── Stats & Link Row ── */}
        <div
          className={cn(
            'p-6 rounded-[24px] flex flex-col md:flex-row gap-8',
            glassCard
          )}
        >
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Tokens Stat */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-[11px] font-bold tracking-[1px] text-white/30 uppercase">
                <Zap size={12} className="text-[#007AFF]" />
                {tp('partnerTokens')}
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold">
                  {isLoading ? '...' : totalTokens}
                </span>
                <span className="text-sm font-medium text-white/30">💎</span>
              </div>
            </div>
            {/* Sales Stat (Simulated/Placeholder) */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-[11px] font-bold tracking-[1px] text-white/30 uppercase">
                <CreditCard size={12} />
                {tp('salesAmount')}
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold">~ 0</span>
                <span className="text-sm font-medium text-white/30">$</span>
              </div>
            </div>
          </div>

          <div className="w-px bg-white/5 self-stretch hidden md:block" />

          <div className="flex-1 flex flex-col gap-4">
            <p className="text-[13px] text-white/60 leading-relaxed">
              {tp('sharePrompt')}
            </p>
            <div className="relative group">
              <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-black/40 border border-white/5 focus-within:border-[#007AFF]/40 transition-colors">
                <LinkIcon
                  size={16}
                  className="text-white/20 group-focus-within:text-[#007AFF]/50 transition-colors"
                />
                <code className="flex-1 text-[13px] text-white/80 font-mono truncate">
                  {referralLink || '...'}
                </code>
                <button
                  onClick={handleCopyRef}
                  className={cn(
                    'p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#007AFF] transition-all active:scale-90'
                  )}
                >
                  {copiedRef ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Referrals Section ── */}
        <div
          className={cn('p-6 rounded-[24px] flex flex-col gap-6', glassCard)}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-[-0.5px]">
              {tp('myReferrals')}
            </h2>
            <div className="flex items-center gap-3 bg-white/5 px-3 py-2 rounded-full border border-white/5">
              <span className="text-[12px] font-medium text-white/40">
                {tp('mostActive')}
              </span>
              <button
                onClick={() => setActiveOnly(!activeOnly)}
                className={cn(
                  'w-10 h-5 rounded-full relative transition-colors duration-200',
                  activeOnly ? 'bg-[#007AFF]' : 'bg-white/10'
                )}
              >
                <div
                  className={cn(
                    'absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-200',
                    activeOnly ? 'left-6' : 'left-1'
                  )}
                />
              </button>
            </div>
          </div>

          {/* Counts Row */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: tp('participants'), value: stats.total_referrals || 0 },
              {
                label: tp('levelN', { n: 1 }),
                value: levelStats.find((l: any) => l.level === 1)?.count || 0,
              },
              {
                label: tp('levelN', { n: 2 }),
                value: levelStats.find((l: any) => l.level === 2)?.count || 0,
              },
              {
                label: tp('levelN', { n: 3 }),
                value: levelStats.find((l: any) => l.level === 3)?.count || 0,
              },
            ].map((item, i) => (
              <div key={i} className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-white/30 uppercase tracking-wider">
                  {item.label}
                </span>
                <span className="text-xl font-bold leading-none">
                  {isLoading ? '...' : item.value}
                </span>
              </div>
            ))}
          </div>

          <div className="h-px bg-white/5" />

          {/* Table Header */}
          <div className="grid grid-cols-3 px-2 text-[12px] font-bold text-white/30 uppercase tracking-wider">
            <span>{tp('level')}</span>
            <span className="text-center">{tp('payments')}</span>
            <span className="text-right">{tp('regDate')}</span>
          </div>

          <div className="flex flex-col min-h-[140px]">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-[#007AFF]/40" />
              </div>
            ) : referrals.length > 0 ? (
              <div className="flex flex-col gap-2">
                {referrals.map((ref: any, idx: number) => (
                  <div
                    key={idx}
                    className="grid grid-cols-3 px-2 py-3.5 items-center border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[11px] font-bold text-white/60">
                        {ref.level}
                      </div>
                      <span className="text-[13px] font-medium truncate">
                        {ref.first_name ||
                          ref.username ||
                          `User #${ref.user_id}`}
                      </span>
                    </div>
                    <div className="text-center text-[13px] font-bold text-[#007AFF]">
                      {ref.tokens_earned || 0} 💎
                    </div>
                    <div className="text-right text-[12px] text-white/30 font-medium">
                      {ref.created_at
                        ? new Date(ref.created_at).toLocaleDateString()
                        : '—'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10 opacity-30">
                <Calendar size={32} />
                <p className="text-[14px] font-medium">{tp('noData')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
};
