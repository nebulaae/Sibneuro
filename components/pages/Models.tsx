'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAIModels } from '@/hooks/useModels';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ModelsEmpty } from '@/components/states/Empty';
import { ErrorComponent } from '@/components/states/Error';

/* ─── Spring & Glass tokens ─── */
const spring = 'all 0.28s cubic-bezier(0.32, 0.72, 0, 1)';

const glassThin: React.CSSProperties = {
  background: 'var(--glass-thin)',
  backdropFilter: 'var(--blur-thin) var(--vibrancy)',
  WebkitBackdropFilter: 'var(--blur-thin) var(--vibrancy)',
  border: 'var(--glass-border-thin)',
  boxShadow: 'var(--glass-specular)',
};

const TABS = [
  { key: 'all', label: 'Все' },
  { key: 'text', label: 'Текст' },
  { key: 'image', label: 'Фото' },
  { key: 'video', label: 'Видео' },
  { key: 'audio', label: 'Аудио' },
];

const CATEGORY_LABEL: Record<string, string> = {
  text: 'Текст',
  image: 'Фото',
  video: 'Видео',
  audio: 'Аудио',
};

const CAT_ICON: Record<string, string> = {
  text: '✦',
  image: '◈',
  video: '▶',
  audio: '♫',
};

/* ─── Skeleton row ─── */
const SkeletonRow = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '14px 20px',
      borderBottom: '1px solid var(--sys-separator)',
    }}
  >
    <div
      style={{
        width: 46,
        height: 46,
        borderRadius: 14,
        flexShrink: 0,
        background: 'var(--glass-thin)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        animation: 'pulse-opacity 1.6s ease-in-out infinite',
      }}
    />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        style={{
          width: '42%',
          height: 13,
          borderRadius: 6,
          background: 'var(--glass-thin)',
          animation: 'pulse-opacity 1.6s ease-in-out 0.1s infinite',
        }}
      />
      <div
        style={{
          width: '25%',
          height: 10,
          borderRadius: 6,
          background: 'var(--glass-thin)',
          animation: 'pulse-opacity 1.6s ease-in-out 0.2s infinite',
        }}
      />
    </div>
    <div
      style={{
        width: 44,
        height: 22,
        borderRadius: 99,
        background: 'var(--glass-thin)',
        animation: 'pulse-opacity 1.6s ease-in-out 0.15s infinite',
        flexShrink: 0,
      }}
    />
  </div>
);

export const Models = () => {
  const [tab, setTab] = useState('all');
  const router = useRouter();
  const { data: models, isLoading, isError, refetch } = useAIModels();

  if (isError) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100svh',
          padding: '24px 20px',
        }}
      >
        <ErrorComponent
          title="Ошибка загрузки"
          description="Не удалось получить список моделей."
          onRetry={refetch}
        />
      </div>
    );
  }

  const filtered =
    tab === 'all'
      ? models || []
      : (models || []).filter(
          (m) => m.categories?.includes(tab) || m.mainCategory === tab
        );

  const handleModelClick = (techName: string, mainCategory?: string) => {
    if (mainCategory === 'text') {
      router.push(`/chats?model=${techName}`);
    } else {
      router.push(`/generate?model=${techName}`);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100svh',
        /* safe area bottom + bottombar */
        paddingBottom: 'calc(80px + max(16px, env(safe-area-inset-bottom)))',
        overflowX: 'hidden',
      }}
    >
      {/* ── Sticky header ── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          padding: '14px 20px',
          backdropFilter: 'var(--blur-chrome) var(--vibrancy)',
          WebkitBackdropFilter: 'var(--blur-chrome) var(--vibrancy)',
          background: 'var(--glass-ultra-thin)',
          borderBottom: 'var(--glass-border-thin)',
          boxShadow: 'var(--glass-specular)',
        }}
      >
        {/* Desktop max-w wrapper */}
        <div style={{ maxWidth: 760, marginInline: 'auto' }}>
          <span
            style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' }}
          >
            Модели
          </span>
        </div>
      </header>

      {/* ── Tabs ── */}
      <div
        style={{
          position: 'sticky',
          top: 51,
          zIndex: 39,
          backdropFilter: 'blur(30px) saturate(160%)',
          WebkitBackdropFilter: 'blur(30px) saturate(160%)',
          background: 'var(--glass-ultra-thin)',
          borderBottom: '1px solid var(--sys-separator)',
        }}
      >
        <div
          style={{
            maxWidth: 760,
            marginInline: 'auto',
            display: 'flex',
            gap: 8,
            padding: '10px 16px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  flexShrink: 0,
                  padding: '6px 16px',
                  borderRadius: 9999,
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: '-0.1px',
                  cursor: 'pointer',
                  transition: spring,
                  whiteSpace: 'nowrap',
                  willChange: 'transform',
                  ...(active
                    ? {
                        background: 'var(--glass-thick)',
                        backdropFilter: 'blur(40px)',
                        WebkitBackdropFilter: 'blur(40px)',
                        border: 'var(--glass-border-regular)',
                        boxShadow:
                          'var(--glass-specular), var(--glass-shadow-sm)',
                        color: 'var(--sys-label)',
                      }
                    : {
                        background: 'var(--glass-thin)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: 'var(--glass-border-thin)',
                        boxShadow: 'none',
                        color: 'var(--sys-label-secondary)',
                      }),
                }}
                onMouseDown={(e) =>
                  (e.currentTarget.style.transform = 'scale(0.93)')
                }
                onMouseUp={(e) =>
                  (e.currentTarget.style.transform = 'scale(1)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = 'scale(1)')
                }
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── List ── */}
      <div style={{ flex: 1 }}>
        <div style={{ maxWidth: 760, marginInline: 'auto' }}>
          {isLoading ? (
            <>
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '48px 24px' }}>
              <ModelsEmpty />
            </div>
          ) : (
            <>
              {filtered.map((m, idx) => {
                const defaultVersion =
                  m.versions?.find((v) => v.default) || m.versions?.[0];
                const cost = defaultVersion?.cost ?? 1;
                const categoryKey = m.mainCategory || '';
                const categoryLabel = CATEGORY_LABEL[categoryKey] || 'AI';
                const categoryIcon = CAT_ICON[categoryKey] || '✦';
                const avatarUrl =
                  m.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(m.model_name)}&background=1c1c1c&color=ffffff&size=128`;
                const isLast = idx === filtered.length - 1;

                return (
                  <button
                    key={m.tech_name}
                    onClick={() =>
                      handleModelClick(m.tech_name, m.mainCategory)
                    }
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '13px 20px',
                      width: '100%',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: isLast
                        ? 'none'
                        : '1px solid var(--sys-separator)',
                      cursor: 'pointer',
                      transition: spring,
                      willChange: 'background',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        'var(--glass-ultra-thin)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        'transparent';
                      (e.currentTarget as HTMLButtonElement).style.transform =
                        'scale(1)';
                    }}
                    onMouseDown={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform =
                        'scale(0.985)';
                      (e.currentTarget as HTMLButtonElement).style.background =
                        'var(--glass-thin)';
                    }}
                    onMouseUp={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform =
                        'scale(1)';
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 14,
                        overflow: 'hidden',
                        flexShrink: 0,
                        border: 'var(--glass-border-thin)',
                        boxShadow: 'var(--glass-specular)',
                      }}
                    >
                      <Avatar style={{ width: '100%', height: '100%' }}>
                        <AvatarImage src={avatarUrl} />
                        <AvatarFallback
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            background: 'var(--glass-regular)',
                            color: 'var(--sys-label)',
                          }}
                        >
                          {m.model_name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: 'var(--sys-label)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          letterSpacing: '-0.2px',
                        }}
                      >
                        {m.model_name}
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          marginTop: 2,
                          color: 'var(--sys-label-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <span>{categoryIcon}</span>
                        <span>{categoryLabel}</span>
                        {m.versions && m.versions.length > 1 && (
                          <>
                            <span style={{ opacity: 0.4 }}>·</span>
                            <span>{m.versions.length} версии</span>
                          </>
                        )}
                      </p>
                    </div>

                    {/* Cost badge */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '3px 10px',
                          borderRadius: 9999,
                          fontSize: 12,
                          fontWeight: 600,
                          ...glassThin,
                          color: 'var(--sys-label-secondary)',
                        }}
                      >
                        💎 {cost}
                      </div>
                      {/* Chevron */}
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        style={{
                          color: 'var(--sys-label-tertiary)',
                          flexShrink: 0,
                        }}
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse-opacity {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default Models;
