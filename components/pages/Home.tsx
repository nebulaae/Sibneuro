'use client';

import { useRouter } from 'next/navigation';
import { useAIModels } from '@/hooks/useModels';
import { usePosts } from '@/hooks/usePosts';
import { useRoles } from '@/hooks/useRoles';
import { useUser } from '@/hooks/useUser';
import { useUI, usePaymentLink } from '@/hooks/useApiExtras';
import { useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ErrorComponent } from '@/components/states/Error';
import { localize } from '@/lib/utils';
import Image from 'next/image';
import { ChevronRight, Music, NotebookPen, Paintbrush, Video, Zap, Sparkles } from 'lucide-react';
import { cleanModelName } from '@/lib/utils';
import { getPostResultImage } from '@/hooks/usePosts';

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
  const { data: trendsData, isLoading: trendsLoading } = useUI('trends');
  const { data: postsData, isLoading: postsLoading } = usePosts({ limit: 4 });
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const posts = postsData?.items || [];
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
          padding: '14px 16px',
          borderRadius: 0,
          borderTop: 'none',
          borderLeft: 'none',
          borderRight: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.10)',
        }}
      >
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: '-0.6px',
            color: '#fff',
          }}
        >
          Sibneuro
        </span>

        <div className='flex items-center gap-1'>
          <button
            onClick={() => router.push('https://t.me/cubixvpnbot?start=HYDylP')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 12px',
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
            <Zap className='size-4 text-[#4FC3F7]' />
            Vpn
          </button>
          {/* Token pill */}
          <button
            onClick={() => paymentUrl && window.open(paymentUrl, '_blank')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 12px',
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
            <span style={{ fontSize: 16, color: '#4FC3F7' }}>◆</span>
            <span>{Math.trunc(tokens)}</span>
            <span style={{ fontSize: 14, color: '#4FC3F7' }}>{t('topUp')}</span>
          </button>
        </div>
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
                    {cleanModelName(m.model_name)}
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
              {t('trending')}
            </span>
            <button
              onClick={() => router.push('/trends')}
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
            className='grid grid-cols-2 md:grid-cols-4 gap-3 w-full'
          >
            {postsLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                <GlassSkeleton key={i} w="100%" h="180px" radius="18px" />
              ))
              : (posts.slice(0, 4).map((post: any) => (
                <button
                  key={post.id}
                  onClick={() => router.push(`/trends?post=${post.id}`)}
                  style={{
                    position: 'relative',
                    aspectRatio: '3/4',
                    borderRadius: 18,
                    overflow: 'hidden',
                    ...glassCard,
                    cursor: 'pointer',
                    transition: 'all 0.22s cubic-bezier(0.32,0.72,0,1)',
                    padding: 0,
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.border = '1px solid rgba(255,255,255,0.24)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.border = '1px solid rgba(255,255,255,0.12)';
                  }}
                >
                  {getPostResultImage(post) ? (
                    <img
                      src={getPostResultImage(post)!}
                      alt=""
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)' }}>
                       <Sparkles className='size-6 text-white/20 mx-auto' />
                    </div>
                  )}
                  
                  {/* Cost badge */}
                  <div style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    padding: '4px 8px',
                    borderRadius: 999,
                    background: 'rgba(0,0,0,0.45)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3
                  }}>
                    <span style={{ color: '#4FC3F7' }}>◆</span>
                    {post.cost || 15}
                  </div>

                  {/* Gradient Overlay */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)',
                  }} />

                  {/* Text */}
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '10px 12px',
                  }}>
                    <p style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#fff',
                      margin: 0,
                      textAlign: 'left',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: 1.2
                    }}>
                      {post.inputs?.text || 'Untitled'}
                    </p>
                  </div>
                </button>
              )))}
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
