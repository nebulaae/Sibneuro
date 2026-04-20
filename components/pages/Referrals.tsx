'use client';

import { useRouter } from 'next/navigation';
import { useReferrals } from '@/hooks/useApiExtras';
import { useHaptic } from '@/hooks/useHaptic';
import { useAuth } from '@/hooks/useAuth';
import { useBot } from '@/app/providers/BotProvider';
import { ChevronLeft, Users, Gift, Zap, Copy, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

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

const glassUltraThin = cn(
  'bg-white/[.04] dark:bg-black/[.35] backdrop-blur-2xl backdrop-saturate-150',
  'border border-white/[.10]',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
);

const spring =
  'transition-all duration-[280ms] [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]';

const StatCard = ({
  icon,
  label,
  value,
  isLoading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  isLoading?: boolean;
}) => (
  <div
    className={cn(
      'flex flex-col gap-2.5 p-4 rounded-[16px]',
      glassRegular
    )}
  >
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-semibold tracking-[0.4px] uppercase text-white/50">
        {label}
      </span>
      <div className="text-white/30">{icon}</div>
    </div>
    {isLoading ? (
      <div className={cn('w-24 h-8 rounded-lg', glassThin)} />
    ) : (
      <span className="text-[28px] font-bold tracking-[-0.6px] leading-none">
        {value}
      </span>
    )}
  </div>
);

export const Referrals = () => {
  const t = useTranslations('Referrals');
  const router = useRouter();
  const haptic = useHaptic();
  const { user: tgUser } = useAuth();
  const { bot } = useBot();
  const { data: refData, isLoading } = useReferrals();
  const [copiedRef, setCopiedRef] = useState(false);

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
    <div className="flex flex-col h-svh" style={{ background: 'var(--page-bg)' }}>
      {/* ── Header ── */}
      <header
        className={cn(
          'shrink-0 sticky top-0 z-10',
          'flex items-center gap-3 px-4 py-3',
          glassUltraThin,
          'rounded-none border-x-0 border-t-0 border-b border-white/10'
        )}
      >
        <button
          onClick={() => {
            haptic.light();
            router.back();
          }}
          className={cn(
            'flex items-center justify-center w-8.5 h-8.5 rounded-full shrink-0',
            glassThin,
            spring,
            'active:scale-[0.88]'
          )}
        >
          <ChevronLeft size={18} className="text-[#0A84FF]" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold tracking-[-0.2px]">
            {t('title')}
          </p>
          <span className="text-[11px] text-white/40">
            {t('subtitle')}
          </span>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Users size={14} />}
            label={t('totalReferrals')}
            value={stats.total_referrals || 0}
            isLoading={isLoading}
          />
          <StatCard
            icon={<Gift size={14} />}
            label={t('unique')}
            value={stats.unique_referrals || 0}
            isLoading={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 gap-3">
          <StatCard
            icon={<Zap size={14} />}
            label={t('tokensEarned')}
            value={isLoading ? '' : `${totalTokens} 💎`}
            isLoading={isLoading}
          />
        </div>

        {/* ── Referral Link Section ── */}
        {referralLink && (
          <div>
            <p className="text-[11px] font-bold tracking-[0.7px] uppercase text-white/50 mb-2.5 px-1">
              {t('yourLink')}
            </p>
            <div className={cn(glassRegular, 'rounded-[16px] p-4')}>
              <div className="flex items-center gap-2.5">
                <code className="flex-1 text-[12px] text-white/70 overflow-hidden text-ellipsis whitespace-nowrap font-mono break-all">
                  {referralLink}
                </code>
                <button
                  onClick={handleCopyRef}
                  className={cn(
                    'flex-shrink-0 p-2 rounded-lg',
                    glassThin,
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
              </div>
              <p className="text-[11px] text-white/40 mt-3 leading-relaxed">
                {t('shareDescription')}
              </p>
            </div>
          </div>
        )}

        {/* ── Level Stats ── */}
        {levelStats && levelStats.length > 0 && (
          <div>
            <p className="text-[11px] font-bold tracking-[0.7px] uppercase text-white/50 mb-2.5 px-1">
              {t('byLevels')}
            </p>
            <div className="flex flex-col gap-2">
              {levelStats.map((level: any, idx: number) => (
                <div
                  key={idx}
                  className={cn(glassRegular, 'rounded-[14px] px-4 py-3 flex items-center justify-between')}
                >
                  <div>
                    <p className="text-[13px] font-semibold text-white">
                      {t('level', { n: level.level || idx + 1 })}
                    </p>
                    <p className="text-[11px] text-white/50 mt-0.5">
                      {t('referralsCount', { count: level.count || 0 })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold text-[#0A84FF]">
                      {level.tokens || 0} 💎
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Referrals List ── */}
        {referrals && referrals.length > 0 && (
          <div>
            <p className="text-[11px] font-bold tracking-[0.7px] uppercase text-white/50 mb-2.5 px-1">
              {t('invitedUsers', { count: referrals.length })}
            </p>
            <div className="flex flex-col gap-2">
              {referrals.map((ref: any, idx: number) => (
                <div
                  key={idx}
                  className={cn(glassRegular, 'rounded-[14px] px-4 py-3')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[13px] font-semibold text-white truncate">
                      {ref.first_name || ref.username || t('user', { id: ref.user_id || idx })}
                    </p>
                    <span className="text-[11px] text-white/50 flex-shrink-0">
                      {ref.tokens_earned || 0} 💎
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-white/40">
                      {ref.created_at
                        ? new Date(ref.created_at).toLocaleDateString(t('locale') === 'en' ? 'en-US' : 'ru-RU')
                        : t('recently')}
                    </span>
                    {ref.level && (
                      <span
                        className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                          glassThin,
                          'text-white/50'
                        )}
                      >
                        {t('level', { n: ref.level })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Empty State ── */}
        {!isLoading && referrals.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center py-16">
            <div
              className={cn(
                'w-13 h-13 rounded-2xl flex items-center justify-center',
                glassRegular
              )}
            >
              <Users size={22} className="text-white/30" />
            </div>
            <p className="text-[14px] text-white/50 max-w-60 leading-relaxed">
              {t('noReferrals')}
            </p>
            <p className="text-[12px] text-white/40 max-w-60">
              {t('noReferralsHint')}
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-white/40" />
          </div>
        )}
      </div>
    </div>
  );
};
