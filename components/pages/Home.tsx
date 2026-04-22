'use client';

import { useRouter } from 'next/navigation';
import { useAIModels } from '@/hooks/useModels';
import { useRoles } from '@/hooks/useRoles';
import { useUser } from '@/hooks/useUser';
import { useUI, usePaymentLink } from '@/hooks/useApiExtras';
import { useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ErrorComponent } from '@/components/states/Error';
import { localize } from '@/lib/utils';

/* ── Skeleton shimmer ── */
const GlassSkeleton = ({
  w,
  h,
  circle,
}: {
  w: string;
  h: string;
  circle?: boolean;
}) => (
  <div
    style={{
      width: w,
      height: h,
      borderRadius: circle ? '9999px' : 'var(--radius-sm)',
      background: 'var(--glass-thin)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: 'var(--glass-border-thin)',
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background:
          'linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)',
        animation: 'shimmer 1.6s infinite',
        backgroundSize: '200% 100%',
      }}
    />
  </div>
);

export const Home = () => {
  const t = useTranslations('Home');
  const router = useRouter();
  const {
    data: models,
    isLoading: modelsLoading,
    isError,
    refetch,
  } = useAIModels();
  const { data: trends, isLoading: trendsLoading } = useUI('trends');
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const { data: userData } = useUser();
  const { data: paymentUrl } = usePaymentLink();

  const displayModels = models?.slice(0, 8) || [];
  const displayRoles = roles?.slice(0, 5) || [];
  const tokens = userData?.user?.tokens ?? 0;

  const handleModelClick = (techName: string, mainCategory?: string) =>
    mainCategory === 'text'
      ? router.push(`/chats?model=${techName}`)
      : router.push(`/generate?model=${techName}`);

  const handleRoleClick = (id: number) => router.push(`/chats?role=${id}`);

  // FIX 1: Trends теперь корректно роутят по tech_name из данных API
  // Данные тренда имеют поля: tech_name, version, title, image, description
  // tech_name типа "nexus/nano-banana" -> /generate, "openrouter/gpt" -> /chats
  const handleTrendClick = (item: any) => {
    if (item.tech_name) {
      // Определяем категорию по tech_name или по наличию model в API
      // Если не знаем — ищем в моделях
      const model = models?.find((m) => m.tech_name === item.tech_name);
      if (model) {
        if (model.mainCategory === 'text') {
          router.push(`/chats?model=${item.tech_name}`);
        } else {
          router.push(`/generate?model=${item.tech_name}`);
        }
      } else {
        // Эвристика: если tech_name содержит 'gpt', 'claude', 'gemini' — это text
        const textKeywords = [
          'gpt',
          'claude',
          'gemini',
          'llama',
          'mistral',
          'chat',
        ];
        const isText = textKeywords.some((kw) =>
          item.tech_name.toLowerCase().includes(kw)
        );
        if (isText) {
          router.push(`/chats?model=${item.tech_name}`);
        } else {
          router.push(`/generate?model=${item.tech_name}`);
        }
      }
    } else if (item.model) {
      router.push(`/generate?model=${item.model}`);
    } else if (item.role_id) {
      router.push(`/chats?role=${item.role_id}`);
    }
  };

  if (isError)
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <ErrorComponent
          title={t('error')}
          description={t('errorLoadData')}
          onRetry={refetch}
        />
      </div>
    );

  return (
    <div
      style={{
        paddingBottom: 'calc(80px + max(16px, env(safe-area-inset-bottom)))',
        maxWidth: 1280,
        marginInline: 'auto',
      }}
    >
      {/* ── Navigation Bar ── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          backdropFilter: 'var(--blur-chrome) var(--vibrancy)',
          WebkitBackdropFilter: 'var(--blur-chrome) var(--vibrancy)',
          borderBottom: 'var(--glass-border-thin)',
          boxShadow: 'var(--glass-specular)',
        }}
      >
        <span
          style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px' }}
        >
          Sibneuro
        </span>

        {/* Token balance pill */}
        <button
          onClick={() => paymentUrl && window.open(paymentUrl, '_blank')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            height: 34,
            borderRadius: '9999px',
            background: 'var(--glass-regular)',
            backdropFilter: 'var(--blur-regular)',
            WebkitBackdropFilter: 'var(--blur-regular)',
            border: 'var(--glass-border-regular)',
            boxShadow: 'var(--glass-specular), var(--glass-shadow-sm)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.28s cubic-bezier(0.32,0.72,0,1)',
            color: 'var(--sys-label)',
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ color: 'var(--tint-blue)' }}
          >
            <path d="M12 2L2 9l10 13 10-13L12 2zm0 3.5L18.5 9 12 18.5 5.5 9 12 5.5z" />
          </svg>
          <span>{tokens}</span>
        </button>
      </header>

      {/* ── Models Grid ── */}
      <section style={{ padding: '20px 20px 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: '0.7px',
              textTransform: 'uppercase',
              color: 'var(--sys-label-secondary)',
            }}
          >
            {t('models')}
          </span>
          <button
            onClick={() => router.push('/models')}
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--tint-blue)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {t('all')}
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px 8px',
          }}
        >
          {modelsLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <GlassSkeleton w="52px" h="52px" circle />
                  <GlassSkeleton w="44px" h="10px" />
                </div>
              ))
            : displayModels.map((m) => (
                <button
                  key={m.tech_name}
                  onClick={() => handleModelClick(m.tech_name, m.mainCategory)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'transform 0.22s cubic-bezier(0.32,0.72,0,1)',
                    willChange: 'transform',
                  }}
                  onMouseDown={(e) =>
                    (e.currentTarget.style.transform = 'scale(0.88)')
                  }
                  onMouseUp={(e) =>
                    (e.currentTarget.style.transform = 'scale(1)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.transform = 'scale(1)')
                  }
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '9999px',
                      overflow: 'hidden',
                      border: 'var(--glass-border-regular)',
                      boxShadow:
                        'var(--glass-specular), var(--glass-shadow-sm)',
                      background: 'var(--glass-thin)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                    }}
                  >
                    <Avatar className="size-full">
                      <AvatarImage
                        src={
                          m.avatar ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(m.model_name)}&background=1c1c1c&color=fff`
                        }
                      />
                      <AvatarFallback style={{ fontSize: 13, fontWeight: 700 }}>
                        {m.model_name.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 400,
                      color: 'var(--sys-label-secondary)',
                      maxWidth: 56,
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      lineHeight: 1.2,
                    }}
                  >
                    {m.model_name}
                  </span>
                </button>
              ))}
        </div>
      </section>

      {/* ── Separator ── */}
      <div
        style={{
          height: 1,
          background: 'var(--sys-separator)',
          margin: '20px 0',
        }}
      />

      {/* ── AI Assistants ── */}
      <section>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px 14px',
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: '0.7px',
              textTransform: 'uppercase',
              color: 'var(--sys-label-secondary)',
            }}
          >
            {t('aiAssistants')}
          </span>
          <button
            onClick={() => router.push('/chats')}
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: 'var(--tint-blue)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {t('all')}
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 12,
            padding: '0 20px 4px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          {rolesLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    flexShrink: 0,
                    width: 72,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <GlassSkeleton w="56px" h="56px" />
                  <GlassSkeleton w="56px" h="10px" />
                </div>
              ))
            : displayRoles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleRoleClick(role.id)}
                  style={{
                    flexShrink: 0,
                    width: 72,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'transform 0.22s cubic-bezier(0.32,0.72,0,1)',
                  }}
                  onMouseDown={(e) =>
                    (e.currentTarget.style.transform = 'scale(0.88)')
                  }
                  onMouseUp={(e) =>
                    (e.currentTarget.style.transform = 'scale(1)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.transform = 'scale(1)')
                  }
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      border: 'var(--glass-border-regular)',
                      boxShadow:
                        'var(--glass-specular), var(--glass-shadow-sm)',
                      background: 'var(--glass-thin)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                    }}
                  >
                    <Avatar className="size-full rounded-none">
                      <AvatarImage src={role.image || ''} />
                      <AvatarFallback style={{ fontSize: 22 }}>
                        {localize(role.label).slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: 'var(--sys-label-secondary)',
                      width: '100%',
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      lineHeight: 1.2,
                    }}
                  >
                    {localize(role.label)}
                  </span>
                </button>
              ))}
        </div>
      </section>

      <div
        style={{
          height: 1,
          background: 'var(--sys-separator)',
          margin: '20px 0',
        }}
      />

      {/* ── Trending ── */}
      <section style={{ padding: '0 16px' }}>
        <span
          style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: '0.7px',
            textTransform: 'uppercase',
            color: 'var(--sys-label-secondary)',
            marginBottom: 12,
            padding: '0 4px',
          }}
        >
          {t('trending')}
        </span>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {trendsLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <GlassSkeleton key={i} w="100%" h="52px" />
              ))
            : ((trends as any[]) || []).length === 0
              ? (
                  [
                    {
                      icon: '🎨',
                      title: t('trend1'),
                      href: '/generate',
                    },
                    {
                      icon: '🤖',
                      title: t('trend2'),
                      href: '/chats',
                    },
                    {
                      icon: '📸',
                      title: t('trend3'),
                      href: '/generate',
                    },
                    {
                      icon: '🎵',
                      title: t('trend4'),
                      href: '/generate',
                    },
                  ] as any[]
                ).map((item) => (
                  <button
                    key={item.title}
                    onClick={() => router.push(item.href)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--glass-thin)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: 'var(--glass-border-thin)',
                      boxShadow: 'var(--glass-specular)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'all 0.22s cubic-bezier(0.32,0.72,0,1)',
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = 'scale(0.985)';
                      e.currentTarget.style.background = 'var(--glass-regular)';
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.background = 'var(--glass-thin)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.background = 'var(--glass-thin)';
                    }}
                  >
                    <span
                      style={{
                        fontSize: 20,
                        width: 32,
                        textAlign: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {item.icon}
                    </span>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        flex: 1,
                        color: 'var(--sys-label)',
                      }}
                    >
                      {item.title}
                    </span>
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
                  </button>
                ))
              : (trends as any[]).map((item: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => handleTrendClick(item)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--glass-thin)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: 'var(--glass-border-thin)',
                      boxShadow: 'var(--glass-specular)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'all 0.22s cubic-bezier(0.32,0.72,0,1)',
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = 'scale(0.985)';
                      e.currentTarget.style.background = 'var(--glass-regular)';
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.background = 'var(--glass-thin)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.background = 'var(--glass-thin)';
                    }}
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt=""
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 'var(--radius-sm)',
                          objectFit: 'cover',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: 20,
                          width: 32,
                          textAlign: 'center',
                          flexShrink: 0,
                        }}
                      >
                        ✨
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        flex: 1,
                        color: 'var(--sys-label)',
                      }}
                    >
                      {localize(item.title)}
                    </span>
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
                  </button>
                ))}
        </div>
      </section>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
};

export default Home;
