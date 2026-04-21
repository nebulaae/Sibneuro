'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAIModels } from '@/hooks/useModels';
import { useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ModelsEmpty } from '@/components/states/Empty';
import { ErrorComponent } from '@/components/states/Error';
import { useHaptic } from '@/hooks/useHaptic';
import { cn } from '@/lib/utils';

const getTabs = (t: any) =>
  [
    { key: 'all', label: t('tabAll') },
    { key: 'text', label: t('tabText') },
    { key: 'image', label: t('tabImage') },
    { key: 'video', label: t('tabVideo') },
    { key: 'audio', label: t('tabAudio') },
  ] as const;

const getCategoryLabels = (t: any): Record<string, string> => ({
  text: t('catText'),
  image: t('catImage'),
  video: t('catVideo'),
  audio: t('catAudio'),
});
const CAT_ICON: Record<string, string> = {
  text: '✦',
  image: '◈',
  video: '▶',
  audio: '♫',
};

/* ── Shared class strings ── */
const glassThin = cn(
  'bg-white/[.07] dark:bg-black/[.45] backdrop-blur-xl backdrop-saturate-150',
  'border border-white/[.14]',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
);
const glassThick = cn(
  'bg-white/[.13] dark:bg-black/[.65] backdrop-blur-3xl backdrop-saturate-200',
  'border border-white/[.22]',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_32px_rgba(0,0,0,0.28)]'
);
const spring =
  'transition-all duration-[280ms] [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]';

/* ── Skeleton row ── */
const SkeletonRow = () => (
  <div className="flex items-center gap-3.5 px-5 py-3.25 border-b border-white/6">
    <div
      className={cn(
        'w-11.5 h-11.5 rounded-[14px] shrink-0',
        glassThin,
        'animate-[pulse-opacity_1.6s_ease-in-out_infinite]'
      )}
    />
    <div className="flex-1 flex flex-col gap-1.5">
      <div
        className={cn(
          'w-[42%] h-3.25 rounded-md',
          glassThin,
          'animate-[pulse-opacity_1.6s_ease-in-out_0.1s_infinite]'
        )}
      />
      <div
        className={cn(
          'w-[25%] h-2.5 rounded-md',
          glassThin,
          'animate-[pulse-opacity_1.6s_ease-in-out_0.2s_infinite]'
        )}
      />
    </div>
    <div
      className={cn(
        'w-11 h-5.5 rounded-full',
        glassThin,
        'animate-[pulse-opacity_1.6s_ease-in-out_0.15s_infinite]'
      )}
    />
  </div>
);

export const Models = () => {
  const t = useTranslations('Models');
  const TABS = getTabs(t);
  const CATEGORY_LABEL = getCategoryLabels(t);
  const [tab, setTab] = useState<string>('all');
  const router = useRouter();
  const haptic = useHaptic();
  const { data: models, isLoading, isError, refetch } = useAIModels();

  if (isError)
    return (
      <div className="flex items-center justify-center min-h-svh p-6">
        <ErrorComponent
          title={t('error')}
          description={t('errorDescription')}
          onRetry={refetch}
        />
      </div>
    );

  const filtered =
    tab === 'all'
      ? models || []
      : (models || []).filter(
          (m) => m.categories?.includes(tab) || m.mainCategory === tab
        );

  const handleModelClick = (techName: string, mainCategory?: string) => {
    haptic.light();
    mainCategory === 'text'
      ? router.push(`/chats?model=${techName}`)
      : router.push(`/generate?model=${techName}`);
  };

  return (
    <div
      className={cn(
        'flex flex-col min-h-svh',
        'pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))] overflow-x-hidden'
      )}
    >
      {/* ── Header ── */}
      <header
        className={cn(
          'sticky top-0 z-40 px-5 py-3.5',
          'bg-white/4 dark:bg-black/35 backdrop-blur-2xl backdrop-saturate-150',
          'border-b border-white/10',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
        )}
      >
        <div className="max-w-190 mx-auto">
          <span className="text-[22px] font-bold tracking-[-0.5px]">
            {t('title')}
          </span>
        </div>
      </header>

      {/* ── Tabs ── */}
      <div
        className={cn(
          'sticky top-12.75 z-39',
          'bg-white/4 dark:bg-black/30 backdrop-blur-[30px] backdrop-saturate-160',
          'border-b border-white/8'
        )}
      >
        <div className="max-w-190 mx-auto flex gap-2 px-4 py-2.5 overflow-x-auto scrollbar-hide">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => {
                  haptic.selection();
                  setTab(t.key);
                }}
                className={cn(
                  'shrink-0 px-4 py-1.5 rounded-full',
                  'text-[13px] font-semibold tracking-[-0.1px] cursor-pointer whitespace-nowrap',
                  spring,
                  'active:scale-[0.93]',
                  active
                    ? cn(glassThick, 'text-white')
                    : cn(glassThin, 'text-white/50')
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── List ── */}
      <div className="flex-1">
        <div className="max-w-190 mx-auto">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
          ) : filtered.length === 0 ? (
            <div className="p-12">
              <ModelsEmpty />
            </div>
          ) : (
            filtered.map((m, idx) => {
              const defVersion =
                m.versions?.find((v) => v.default) || m.versions?.[0];
              const cost = defVersion?.cost ?? 1;
              const catKey = m.mainCategory || '';
              const catLabel = CATEGORY_LABEL[catKey] || 'AI';
              const catIcon = CAT_ICON[catKey] || '✦';
              const avatarUrl =
                m.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(m.model_name)}&background=1c1c1c&color=ffffff&size=128`;
              const isLast = idx === filtered.length - 1;

              return (
                <button
                  key={m.tech_name}
                  onClick={() => handleModelClick(m.tech_name, m.mainCategory)}
                  className={cn(
                    'flex items-center gap-3.5 px-5 py-3.25 w-full text-left',
                    'bg-transparent border-none cursor-pointer',
                    !isLast && 'border-b border-white/6',
                    spring,
                    'hover:bg-white/4 active:bg-white/[.07] active:scale-[0.985]'
                  )}
                >
                  {/* Avatar */}
                  <div className="w-11.5 h-11.5 rounded-[14px] overflow-hidden shrink-0 border border-white/[.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                    <Avatar className="size-full">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback className="text-[12px] font-bold bg-white/10 text-white">
                        {m.model_name.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-white truncate tracking-[-0.2px]">
                      {m.model_name}
                    </p>
                    <p className="text-[12px] text-white/50 mt-0.5 flex items-center gap-1.5">
                      <span>{catIcon}</span>
                      <span>{catLabel}</span>
                      {m.versions && m.versions.length > 1 && (
                        <>
                          <span className="opacity-40">·</span>
                          <span>
                            {t('versions', { count: m.versions.length })}
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Cost + chevron */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-0.75 rounded-full text-[12px] font-semibold text-white/50',
                        glassThin
                      )}
                    >
                      💎 {cost}
                    </div>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      className="text-white/30"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <style>{`@keyframes pulse-opacity{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
};

export default Models;
