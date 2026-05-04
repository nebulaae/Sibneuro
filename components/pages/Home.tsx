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
import Image from 'next/image';
import { ChevronRight, Music, NotebookPen, Paintbrush, Video, Zap } from 'lucide-react';

/* ── Skeleton ── */
const GlassSkeleton = ({
  w,
  h,
  circle,
  radius,
}: {
  w: string;
  h: string;
  circle?: boolean;
  radius?: string;
}) => (
  <div
    style={{
      width: w,
      height: h,
      borderRadius: circle ? '9999px' : (radius ?? '10px'),
      background: 'rgba(255,255,255,0.07)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.10)',
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background:
          'linear-gradient(90deg,transparent,rgba(255,255,255,0.09),transparent)',
        animation: 'shimmer 1.6s infinite',
        backgroundSize: '200% 100%',
      }}
    />
  </div>
);

/* ── Glass card ── */
const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  backdropFilter: 'blur(24px) saturate(180%)',
  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.14)',
};

const glassCardHover: React.CSSProperties = {
  background: 'rgba(255,255,255,0.11)',
  backdropFilter: 'blur(28px) saturate(200%)',
  WebkitBackdropFilter: 'blur(28px) saturate(200%)',
  border: '1px solid rgba(255,255,255,0.20)',
};

/* ── Category config ── */
const CATEGORIES = [
  { key: 'text', label: 'Текст', emoji: <NotebookPen />, href: '/generate?cat=text' },
  { key: 'image', label: 'Фото', emoji: <Paintbrush />, href: '/generate?cat=image' },
  { key: 'video', label: 'Видео', emoji: <Video />, href: '/generate?cat=video' },
  { key: 'music', label: 'Музыка', emoji: <Music />, href: '/generate?cat=audio' },
];

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
    <div className="flex flex-col min-h-[100svh] pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))] overflow-x-hidden">

      {/* ── BG ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: -1,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <Image
          src="/background.jpg"
          alt="bg"
          fill
          style={{
            objectFit: 'cover',
            filter: 'blur(6px) brightness(0.28) saturate(1.3)',
          }}
          priority
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(160deg,rgba(10,10,30,0.55) 0%,transparent 50%,rgba(0,0,0,0.75) 100%)',
          }}
        />
      </div>

      {/* ── Navbar ── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '13px 24px',
          borderRadius: 0,
          borderTop: 'none',
          borderLeft: 'none',
          borderRight: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.10)',
        }}
      >
        <span
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: '-0.6px',
            color: '#fff',
          }}
        >
          Sibneuro
        </span>

        {/* Token pill */}
        <button
          onClick={() => paymentUrl && window.open(paymentUrl, '_blank')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '7px 16px',
            borderRadius: 999,
            background: 'rgba(0,122,255,0.18)',
            border: '1px solid rgba(0,122,255,0.35)',
            fontSize: 14,
            fontWeight: 700,
            color: '#fff',
            cursor: 'pointer',
            transition: 'all 0.22s ease',
          }}
        >
          <span style={{ fontSize: 12, color: '#4FC3F7' }}>◆</span>
          <span>{tokens}</span>
        </button>
      </header>

      <div
        style={{
          padding: '0 20px',
          paddingBottom: 'calc(80px + max(20px, env(safe-area-inset-bottom)))',
        }}
      >
        {/* ── Hero + Category Buttons ── */}
        <section style={{ paddingTop: 28, marginBottom: 28 }}>
          <h1
            style={{
              fontSize: 'clamp(28px, 5vw, 44px)',
              fontWeight: 800,
              letterSpacing: '-0.8px',
              color: '#fff',
              marginBottom: 6,
              lineHeight: 1.15,
            }}
          >
            {t("heroTitle")} <span style={{ color: '#4FC3F7' }}>{t("heroAccent")}</span>
          </h1>
          <p
            style={{
              fontSize: 15,
              color: 'rgba(255,255,255,0.45)',
              marginBottom: 20,
            }}
          >
            {t("heroSubtitle")}
          </p>

          <div
            className="grid grid-cols-2 gap-4 sm:grid-cols-4"
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => router.push(cat.href)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '16px 8px',
                  borderRadius: 18,
                  ...glassCard,
                  cursor: 'pointer',
                  transition: 'all 0.24s cubic-bezier(0.32,0.72,0,1)',
                  color: '#fff',
                }}
                onMouseEnter={(e) =>
                  Object.assign(e.currentTarget.style, {
                    ...glassCardHover,
                    transform: 'translateY(-2px)',
                  })
                }
                onMouseLeave={(e) =>
                  Object.assign(e.currentTarget.style, {
                    ...glassCard,
                    transform: 'none',
                  })
                }
                onMouseDown={(e) =>
                  (e.currentTarget.style.transform = 'scale(0.94)')
                }
                onMouseUp={(e) => (e.currentTarget.style.transform = 'none')}
              >
                <span style={{ fontSize: 28 }}>{cat.emoji}</span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.85)',
                  }}
                >
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Models Grid ── */}
        <section style={{ marginBottom: 28 }}>
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
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              {t('models')}
            </span>
            <button
              onClick={() => router.push('/models')}
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#4FC3F7',
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
              gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
              gap: '18px 10px',
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
                  <GlassSkeleton w="54px" h="54px" circle />
                  <GlassSkeleton w="44px" h="10px" />
                </div>
              ))
              : displayModels.map((m) => (
                <button
                  key={m.tech_name}
                  onClick={() =>
                    router.push(`/generate?model=${m.tech_name}`)
                  }
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 7,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'transform 0.22s cubic-bezier(0.32,0.72,0,1)',
                  }}
                  onMouseDown={(e) =>
                    (e.currentTarget.style.transform = 'scale(0.87)')
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
                      width: 54,
                      height: 54,
                      borderRadius: '9999px',
                      overflow: 'hidden',
                      border: '1px solid rgba(255,255,255,0.16)',
                      background: 'rgba(255,255,255,0.07)',
                      backdropFilter: 'blur(20px)',
                    }}
                  >
                    <Avatar className="size-full">
                      <AvatarImage
                        src={
                          m.avatar ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(m.model_name)}&background=1c1c1c&color=fff`
                        }
                      />
                      <AvatarFallback
                        style={{ fontSize: 13, fontWeight: 700 }}
                      >
                        {m.model_name.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: 'rgba(255,255,255,0.5)',
                      maxWidth: 62,
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.model_name}
                  </span>
                </button>
              ))}
          </div>
        </section>

        <div
          style={{
            height: 1,
            background: 'rgba(255,255,255,0.08)',
            margin: '0 0 24px',
          }}
        />

        {/* ── AI Assistants ── */}
        <section style={{ marginBottom: 28 }}>
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
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              {t('aiAssistants')}
            </span>
            <button
              onClick={() => router.push('/chats')}
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#4FC3F7',
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
              overflowX: 'auto',
              scrollbarWidth: 'none',
              paddingBottom: 4,
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
                  <GlassSkeleton w="56px" h="56px" radius="14px" />
                  <GlassSkeleton w="56px" h="10px" />
                </div>
              ))
              : displayRoles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => router.push(`/chats?role=${role.id}`)}
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
                    (e.currentTarget.style.transform = 'scale(0.87)')
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
                      borderRadius: 14,
                      overflow: 'hidden',
                      border: '1px solid rgba(255,255,255,0.16)',
                      background: 'rgba(255,255,255,0.07)',
                      backdropFilter: 'blur(20px)',
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
                      fontSize: 11,
                      fontWeight: 500,
                      color: 'rgba(255,255,255,0.5)',
                      width: '100%',
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
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
            background: 'rgba(255,255,255,0.08)',
            margin: '0 0 24px',
          }}
        />

        {/* ── Trending ── */}
        <section style={{
          marginBottom: 20,
          width: '100%',
        }}>
          <span
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.4)',
              marginBottom: 12,
            }}
          >
            {t('trending')}
          </span>

          {/* Desktop: 2-col grid; mobile: single col */}
          <div
            className='grid grid-cols-4 gap-2 w-full'
          >
            {trendsLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                <GlassSkeleton key={i} w="100%" h="58px" radius="14px" />
              ))
              : (((trends as any[]) || []).length === 0
                ? [
                  { icon: '🎨', title: t('trend1'), href: '/generate' },
                  { icon: '🤖', title: t('trend2'), href: '/chats' },
                  { icon: '📸', title: t('trend3'), href: '/generate' },
                  { icon: '🎵', title: t('trend4'), href: '/generate' },
                ]
                : (trends as any[])
              ).map((item: any, i: number) => (
                <button
                  key={i}
                  onClick={() =>
                    item.href ? router.push(item.href) : undefined
                  }
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    borderRadius: 14,
                    ...glassCard,
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.22s cubic-bezier(0.32,0.72,0,1)',
                  }}
                  onMouseEnter={(e) =>
                    Object.assign(e.currentTarget.style, {
                      ...glassCardHover,
                      transform: 'translateY(-1px)',
                    })
                  }
                  onMouseLeave={(e) =>
                    Object.assign(e.currentTarget.style, {
                      ...glassCard,
                      transform: 'none',
                    })
                  }
                  onMouseDown={(e) =>
                    (e.currentTarget.style.transform = 'scale(0.985)')
                  }
                  onMouseUp={(e) =>
                    (e.currentTarget.style.transform = 'none')
                  }
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt=""
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        objectFit: 'cover',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: 22,
                        width: 34,
                        textAlign: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {item.icon ?? '✨'}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      flex: 1,
                      color: '#fff',
                    }}
                  >
                    {item.title ? localize(item.title) : item.title}
                  </span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    style={{ color: 'rgba(255,255,255,0.28)', flexShrink: 0 }}
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              ))}
          </div>
        </section>


        {/* ── Partnership Button ── */}
        <section style={{ marginBottom: 28 }}>
          <button
            onClick={() => router.push('/profile/referral')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              padding: '16px',
              borderRadius: 18,
              background: 'rgba(0,122,255,0.12)',
              border: '1px solid rgba(0,122,255,0.35)',
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.15), 0 8px 32px rgba(0,122,255,0.15)',
              cursor: 'pointer',
              transition: 'all 0.24s cubic-bezier(0.32,0.72,0,1)',
              color: '#fff',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0,122,255,0.18)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0,122,255,0.12)';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(0,122,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Zap size={16} className="text-[#4FC3F7]" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: 14, fontWeight: 700 }}>
                {t('partnership')}
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.5)',
                  marginTop: 2,
                }}
              >
                {t('partnershipSub')}
              </p>
            </div>
            <ChevronRight size={18} className="ml-auto opacity-30 text-white" />
          </button>
        </section>
      </div>

      {/* ── Marquee ── */}
      <div
        style={{
          position: 'sticky',
          bottom: 48,
          width: '100%',
          marginTop: 0,
          left: 0,
          right: 0,
          padding: '7px 0',
          overflow: 'hidden',
          zIndex: 45,
        }}
      >
        <div
          style={{
            display: 'inline-block',
            whiteSpace: 'nowrap',
            animation: 'marquee 22s linear infinite',
            fontSize: 16,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: '1.2px',
          }}
        >
          {[
            'Nana',
            'Banana',
            'Pro',
            'Veo',
            'Kling',
            'Sora',
            'Flux',
            'MidJourney',
            'Runway',
            'Luma',
          ].map((n, i) => (
            <span key={i}>
              <span style={{ color: 'rgba(255,255,255,0.85)' }}>{n}</span>
              <span
                style={{ margin: '0 14px', color: 'rgba(255,255,255,0.2)' }}
              >
                ·
              </span>
            </span>
          ))}
          {[
            'Nana',
            'Banana',
            'Pro',
            'Veo',
            'Kling',
            'Sora',
            'Flux',
            'MidJourney',
            'Runway',
            'Luma',
          ].map((n, i) => (
            <span key={`b${i}`}>
              <span style={{ color: 'rgba(255,255,255,0.85)' }}>{n}</span>
              <span
                style={{ margin: '0 14px', color: 'rgba(255,255,255,0.2)' }}
              >
                ·
              </span>
            </span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @media(min-width:1024px){ .lg\\:flex{ display:flex!important }}
      `}</style>
    </div>
  );
};

export default Home;
