'use client';

import { useUser } from '@/hooks/useUser';
import { useRequests } from '@/hooks/useRequests';
import { useAuth } from '@/hooks/useAuth';
import {
  useReferrals,
  usePaymentLink,
  useApiTokens,
  useGenerateApiToken,
} from '@/hooks/useApiExtras';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  LogOut,
  Users,
  Star,
  Loader2,
  ExternalLink,
  Key,
  Copy,
  Check,
} from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import { toast } from 'sonner';
import { useState } from 'react';

const spring = 'all 0.28s cubic-bezier(0.32, 0.72, 0, 1)';

const GlassCard = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) => (
  <div
    style={{
      background: 'var(--glass-regular)',
      backdropFilter: 'blur(40px) saturate(180%) contrast(110%)',
      WebkitBackdropFilter: 'blur(40px) saturate(180%) contrast(110%)',
      border: 'var(--glass-border-regular)',
      borderRadius: 'var(--radius-xl)',
      boxShadow: 'var(--glass-specular), var(--glass-shadow-md)',
      ...style,
    }}
  >
    {children}
  </div>
);

const STATUS: Record<string, { icon: string; color: string; label: string }> = {
  completed: { icon: '✅', color: '#34C759', label: 'Готово' },
  error: { icon: '❌', color: '#FF3B30', label: 'Ошибка' },
  processing: { icon: '⏳', color: '#FF9500', label: 'Обработка' },
};

export const Profile = () => {
  const { user: tgUser, logout } = useAuth();
  const { data: userData, isLoading: userLoading } = useUser();
  const { data: refData } = useReferrals();
  const { data: paymentUrl } = usePaymentLink();
  const { data: apiTokens } = useApiTokens();
  const generateToken = useGenerateApiToken();
  const {
    data: reqData,
    isLoading: reqLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useRequests();

  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const tokens = userData?.user?.tokens ?? 0;
  const isPremium = userData?.user?.premium ?? false;
  const premiumEnd = userData?.user?.premium_end;
  const requests = reqData?.pages.flatMap((p) => p) ?? [];
  const refStats = (refData as any)?.stats;
  const name = tgUser
    ? `${tgUser.first_name} ${tgUser.last_name || ''}`.trim()
    : 'Пользователь';
  const username = tgUser?.username || '';

  const handleTopUp = () =>
    paymentUrl
      ? window.open(paymentUrl, '_blank')
      : toast.error('Ссылка на оплату недоступна');
  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token).then(() => {
      setCopiedToken(token);
      toast.success('Токен скопирован');
      setTimeout(() => setCopiedToken(null), 2000);
    });
  };
  const handleGenerateToken = () => {
    generateToken.mutate(undefined, {
      onSuccess: (d) => {
        toast.success('Новый API-токен создан');
        handleCopyToken(d.token);
      },
      onError: () => toast.error('Не удалось создать токен'),
    });
  };

  return (
    <div
      style={{
        paddingBottom: 'calc(80px + max(16px, env(safe-area-inset-bottom)))',
      }}
    >
      {/* ── Nav Bar ── */}
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
          style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' }}
        >
          Профиль
        </span>
        <button
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 'var(--radius-pill)',
            background: 'rgba(255,59,48,0.12)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,59,48,0.22)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
            color: '#FF3B30',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: spring,
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.94)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <LogOut size={13} />
          Выйти
        </button>
      </header>

      {/* ── User Hero ── */}
      <div style={{ padding: '24px 20px 20px' }}>
        <GlassCard style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Avatar */}
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '9999px',
                overflow: 'hidden',
                border: '2px solid rgba(255,255,255,0.3)',
                boxShadow: 'var(--glass-specular), var(--glass-shadow-md)',
              }}
            >
              <Avatar className="size-full">
                <AvatarImage src={tgUser?.photo_url} />
                <AvatarFallback style={{ fontSize: 22, fontWeight: 700 }}>
                  {name[0]}
                </AvatarFallback>
              </Avatar>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 2,
                }}
              >
                <p
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: '-0.3px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {name}
                </p>
                {isPremium && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background: 'rgba(255,204,0,0.18)',
                      border: '1px solid rgba(255,204,0,0.3)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#b38600',
                    }}
                  >
                    <Star size={9} style={{ fill: 'currentColor' }} />
                    Premium
                  </div>
                )}
              </div>
              {username && (
                <p
                  style={{ fontSize: 14, color: 'var(--sys-label-secondary)' }}
                >
                  @{username}
                </p>
              )}
              {isPremium && premiumEnd && (
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--sys-label-tertiary)',
                    marginTop: 2,
                  }}
                >
                  до {new Date(premiumEnd * 1000).toLocaleDateString('ru-RU')}
                </p>
              )}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* ── Stats Grid ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          padding: '0 20px 20px',
        }}
      >
        {/* Balance */}
        <button
          onClick={handleTopUp}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: 18,
            borderRadius: 'var(--radius-xl)',
            background: 'var(--glass-regular)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            border: 'var(--glass-border-regular)',
            boxShadow: 'var(--glass-specular), var(--glass-shadow-md)',
            textAlign: 'left',
            cursor: 'pointer',
            transition: spring,
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.4px',
                textTransform: 'uppercase',
                color: 'var(--sys-label-secondary)',
              }}
            >
              Токены
            </span>
            <ExternalLink
              size={12}
              style={{ color: 'var(--sys-label-tertiary)' }}
            />
          </div>
          {userLoading ? (
            <div
              style={{
                width: 64,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--glass-thin)',
              }}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
              <span
                style={{
                  fontSize: 30,
                  fontWeight: 700,
                  letterSpacing: '-0.8px',
                  lineHeight: 1,
                }}
              >
                {tokens}
              </span>
              <span style={{ fontSize: 14, marginBottom: 2 }}>💎</span>
            </div>
          )}
          <span
            style={{ fontSize: 11, fontWeight: 600, color: 'var(--tint-blue)' }}
          >
            Пополнить →
          </span>
        </button>

        {/* Referrals */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: 18,
            borderRadius: 'var(--radius-xl)',
            background: 'var(--glass-regular)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            border: 'var(--glass-border-regular)',
            boxShadow: 'var(--glass-specular), var(--glass-shadow-md)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.4px',
                textTransform: 'uppercase',
                color: 'var(--sys-label-secondary)',
              }}
            >
              Рефералы
            </span>
            <Users size={12} style={{ color: 'var(--sys-label-tertiary)' }} />
          </div>
          {!refStats ? (
            <div
              style={{
                width: 48,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--glass-thin)',
              }}
            />
          ) : (
            <span
              style={{
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: '-0.8px',
                lineHeight: 1,
              }}
            >
              {refStats?.total ?? 0}
            </span>
          )}
          <span style={{ fontSize: 11, color: 'var(--sys-label-secondary)' }}>
            {refStats?.earned ?? 0} 💎 заработано
          </span>
        </div>
      </div>

      {/* ── Separator ── */}
      <div
        style={{
          height: 0.5,
          background: 'var(--sys-separator)',
          margin: '0 0 20px',
        }}
      />

      {/* ── API Tokens ── */}
      <div style={{ padding: '0 20px 20px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.7px',
              textTransform: 'uppercase',
              color: 'var(--sys-label-secondary)',
            }}
          >
            API-токены
          </span>
          <button
            onClick={handleGenerateToken}
            disabled={generateToken.isPending}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 12px',
              borderRadius: 'var(--radius-pill)',
              background: 'rgba(0,122,255,0.12)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(0,122,255,0.22)',
              color: 'var(--tint-blue)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: spring,
              opacity: generateToken.isPending ? 0.6 : 1,
            }}
          >
            {generateToken.isPending ? (
              <Loader2
                size={11}
                style={{ animation: 'apple-spin 0.65s linear infinite' }}
              />
            ) : (
              <Key size={11} />
            )}
            Создать
          </button>
        </div>

        {!apiTokens || apiTokens.length === 0 ? (
          <p
            style={{
              fontSize: 13,
              color: 'var(--sys-label-secondary)',
              padding: '0 4px',
            }}
          >
            Нет токенов. Создайте для доступа к API.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {apiTokens.map((t: any) => (
              <GlassCard
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                }}
              >
                <code
                  style={{
                    flex: 1,
                    fontSize: 12,
                    color: 'var(--sys-label-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontFamily: 'monospace',
                  }}
                >
                  {t.token}
                </code>
                <span
                  style={{
                    fontSize: 10,
                    color: 'var(--sys-label-tertiary)',
                    flexShrink: 0,
                  }}
                >
                  {t.generations} reqs
                </span>
                <button
                  onClick={() => handleCopyToken(t.token)}
                  style={{
                    flexShrink: 0,
                    padding: 6,
                    borderRadius: 'var(--radius-sm)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    transition: spring,
                  }}
                >
                  {copiedToken === t.token ? (
                    <Check size={14} style={{ color: '#34C759' }} />
                  ) : (
                    <Copy
                      size={14}
                      style={{ color: 'var(--sys-label-secondary)' }}
                    />
                  )}
                </button>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          height: 0.5,
          background: 'var(--sys-separator)',
          margin: '0 0 20px',
        }}
      />

      {/* ── Generation History ── */}
      <div style={{ padding: '0 20px' }}>
        <span
          style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.7px',
            textTransform: 'uppercase',
            color: 'var(--sys-label-secondary)',
            marginBottom: 12,
          }}
        >
          История генераций
        </span>

        {reqLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{ display: 'flex', alignItems: 'center', gap: 12 }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--glass-thin)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    flexShrink: 0,
                  }}
                />
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      width: '50%',
                      height: 13,
                      borderRadius: 'var(--radius-xs)',
                      background: 'var(--glass-thin)',
                    }}
                  />
                  <div
                    style={{
                      width: '30%',
                      height: 10,
                      borderRadius: 'var(--radius-xs)',
                      background: 'var(--glass-thin)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <p
            style={{
              fontSize: 14,
              color: 'var(--sys-label-secondary)',
              padding: '16px 4px',
            }}
          >
            Нет генераций
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {requests.map((req) => {
              const st = STATUS[req.status] || {
                icon: '⏳',
                color: 'var(--sys-label-secondary)',
                label: req.status,
              };
              return (
                <div
                  key={req.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    paddingBottom: 14,
                    marginBottom: 14,
                    borderBottom: '0.5px solid var(--sys-separator)',
                  }}
                >
                  {/* Status icon */}
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 'var(--radius-md)',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      background: 'var(--glass-thin)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: 'var(--glass-border-thin)',
                      boxShadow: 'var(--glass-specular)',
                    }}
                  >
                    {st.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {req.model}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: 'var(--sys-label-secondary)',
                        marginTop: 2,
                      }}
                    >
                      {req.version} · {timeAgo(req.created_at)}
                    </p>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: 3,
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{ fontSize: 12, fontWeight: 600, color: st.color }}
                    >
                      {st.label}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--sys-label-tertiary)',
                      }}
                    >
                      {req.cost} 💎
                    </span>
                  </div>
                </div>
              );
            })}

            {hasNextPage && (
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                style={{
                  width: '100%',
                  padding: '12px 0',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--glass-thin)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: 'var(--glass-border-thin)',
                  boxShadow: 'var(--glass-specular)',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--tint-blue)',
                  cursor: 'pointer',
                  transition: spring,
                  marginTop: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
                onMouseDown={(e) =>
                  (e.currentTarget.style.transform = 'scale(0.97)')
                }
                onMouseUp={(e) =>
                  (e.currentTarget.style.transform = 'scale(1)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = 'scale(1)')
                }
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2
                      size={14}
                      style={{ animation: 'apple-spin 0.65s linear infinite' }}
                    />{' '}
                    Загрузка...
                  </>
                ) : (
                  'Загрузить ещё'
                )}
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes apple-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Profile;
