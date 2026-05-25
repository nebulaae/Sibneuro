'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAIModels } from '@/hooks/useModels';
import { useRoles } from '@/hooks/useRoles';
import { useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ModelsEmpty } from '@/components/states/Empty';
import { ErrorComponent } from '@/components/states/Error';
import { useHaptic } from '@/hooks/useHaptic';
import { cn, localize } from '@/lib/utils';

const spring =
  'transition-all duration-[280ms] [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]';

/* ── Liquid glass tokens ── */
const glass = {
  thin: 'bg-white/[.06] backdrop-blur-xl border border-white/[.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]',
  card: 'bg-white/[.055] backdrop-blur-2xl border border-white/[.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_4px_20px_rgba(0,0,0,0.25)]',
  tab: 'bg-white/[.05] border border-white/[.08]',
  activeTab: 'bg-cyan-400/15 border border-cyan-400/25 text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.18)]',
};

const CAT_ICON: Record<string, string> = {
  text: '✦',
  image: '◈',
  video: '▶',
  audio: '♫',
};

const SkeletonRow = () => (
  <div className="flex items-center gap-4 p-4 rounded-[22px] border border-white/[0.06] bg-white/[0.04] animate-pulse">
    <div className="w-14 h-14 rounded-2xl bg-white/[0.08] shrink-0" />
    <div className="flex-1 flex flex-col gap-2">
      <div className="w-[42%] h-4 rounded-md bg-white/[0.08]" />
      <div className="w-[25%] h-3 rounded-md bg-white/[0.05]" />
    </div>
    <div className="w-12 h-6 rounded-full bg-white/[0.05]" />
  </div>
);

export const Models = () => {
  const t = useTranslations('Models');
  const [tab, setTab] = useState<string>('all');
  const router = useRouter();
  const haptic = useHaptic();
  const { data: models, isLoading, isError, refetch } = useAIModels();
  const { data: roles, isLoading: rolesLoading } = useRoles();

  const TABS = [
    { key: 'all', label: t('tabAll') },
    { key: 'text', label: t('tabText') },
    { key: 'image', label: t('tabImage') },
    { key: 'video', label: t('tabVideo') },
    { key: 'audio', label: t('tabAudio') },
  ] as const;

  const CATEGORY_LABEL: Record<string, string> = {
    text: t('catText'),
    image: t('catImage'),
    video: t('catVideo'),
    audio: t('catAudio'),
  };

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

  const handleModelClick = (techName: string) => {
    haptic.light();
    router.push(`/generate?model=${techName}`);
  };

  return (
    <div className="flex flex-col min-h-svh pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))] overflow-x-hidden text-white">
      {/* Aurora bg */}

      {/* Header */}
      <header className="sticky top-0 z-40 px-5 py-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-[30px] font-black tracking-tight bg-gradient-to-r from-cyan-200 via-sky-300 to-emerald-200 bg-clip-text text-transparent leading-tight">
            {t('title')}
          </h1>
        </div>
      </header>

      {/* Tabs */}
      <div className="sticky top-[65px] z-30">
        <div className="max-w-2xl mx-auto flex gap-2 px-4 py-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((tabItem) => {
            const active = tab === tabItem.key;
            return (
              <button
                key={tabItem.key}
                onClick={() => {
                  haptic.selection();
                  setTab(tabItem.key);
                }}
                className={cn(
                  'shrink-0 px-4 py-1.5 rounded-full text-[14px] font-semibold whitespace-nowrap',
                  spring,
                  'active:scale-[0.93]',
                  active
                    ? glass.activeTab
                    : cn(glass.tab, 'text-white/40 hover:text-white/60')
                )}
              >
                {tabItem.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="max-w-2xl mx-auto">
          {/* AI Assistants */}
          {(tab === 'all' || tab === 'text') && (
            <section className="px-4 pt-6 pb-2">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/30 mb-4 px-1">
                {t('aiAssistants')}
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-1">
                {rolesLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-36 w-36 shrink-0 animate-pulse rounded-[22px] bg-white/[0.06] border border-white/[0.07]"
                    />
                  ))
                  : roles?.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => {
                        haptic.light();
                        router.push(`/chats?role=${role.id}`);
                      }}
                      className={cn(
                        'w-36 shrink-0 rounded-[22px] p-4 text-left',
                        glass.card,
                        spring,
                        'active:scale-[0.96] hover:border-cyan-300/20 hover:bg-white/[0.08]'
                      )}
                    >
                      <Avatar className="mb-3 size-14 rounded-2xl border border-white/[0.12]">
                        <AvatarImage src={role.image || ''} className='object-cover' />
                        <AvatarFallback className="rounded-2xl bg-white/[0.10] text-lg font-bold">
                          {localize(role.label).slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="truncate text-[14px] font-bold text-white">
                        {localize(role.label)}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-white/35">
                        {localize(role.description)}
                      </p>
                    </button>
                  ))}
              </div>
            </section>
          )}

          {/* Section label */}
          <div className="px-5 pb-2 pt-5">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/30">
              {tab === 'all' ? t('catAll') : CATEGORY_LABEL[tab]}
            </h2>
          </div>

          {/* Models list */}
          <div className="flex flex-col gap-2 px-4 pb-4">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
            ) : filtered.length === 0 ? (
              <div className="py-12 px-4">
                <ModelsEmpty />
              </div>
            ) : (
              filtered.map((m) => {
                const defVersion =
                  m.versions?.find((v) => v.default) || m.versions?.[0];
                const cost = defVersion?.cost ?? 1;
                const catKey = m.mainCategory || '';
                const catLabel = CATEGORY_LABEL[catKey] || 'AI';
                const catIcon = CAT_ICON[catKey] || '✦';
                const avatarUrl =
                  m.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(m.model_name)}&background=1a1a1a&color=ffffff&size=128`;

                return (
                  <button
                    key={m.tech_name}
                    onClick={() => handleModelClick(m.tech_name)}
                    className={cn(
                      'flex items-center gap-4 p-4 w-full text-left rounded-[22px]',
                      'bg-white/[0.04] border border-white/[0.07]',
                      'hover:bg-white/[0.07] hover:border-cyan-300/20',
                      spring,
                      'active:scale-[0.985]'
                    )}
                  >
                    <div className="w-14 h-14 overflow-hidden">
                      <Avatar className="size-full">
                        <AvatarImage src={avatarUrl} />
                        <AvatarFallback className="text-[14px] font-bold bg-white/[0.08] text-white">
                          {m.model_name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    <div className="flex-1 flex flex-col items-start min-w-0">
                      <p className="text-[16px] font-bold text-white truncate tracking-[-0.2px]">
                        {m.model_name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 text-[12px] text-white/35">
                        <span>{catIcon}</span>
                        <span>{catLabel}</span>
                        {m.versions && m.versions.length > 1 && (
                          <>
                            <span className="opacity-40">·</span>
                            <span className="px-1.5 py-0.5 rounded-md bg-white/[0.06] text-[10px] font-bold uppercase tracking-wider">
                              {t('versions', { count: m.versions.length })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-[12px] font-semibold text-white/45">
                        ◈ {cost}
                      </div>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        className="text-white/25"
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
      </div>
    </div>
  );
};

export default Models;