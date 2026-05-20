'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Brain, Sparkles, MessageCircle, UserRound } from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useHaptic } from '@/hooks/useHaptic';

const ACCENT = 'oklch(71.5% 0.143 215.221)';

const INACTIVE_ICON = 'rgba(255,255,255,0.42)';
const INACTIVE_LABEL = 'rgba(255,255,255,0.30)';

/* ───────────────────────────────────────────── */
/* REAL LIQUID GLASS                            */
/* ───────────────────────────────────────────── */

const glassBase: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',

  background: 'rgba(18,18,20,0.34)',

  backdropFilter: 'blur(14px) saturate(180%)',
  WebkitBackdropFilter: 'blur(14px) saturate(180%)',

  border: '1px solid rgba(255,255,255,0.07)',

  boxShadow: `
    inset 0 1px 0 rgba(255,255,255,0.12),
    inset 0 -1px 0 rgba(255,255,255,0.04),

    0 10px 40px rgba(0,0,0,0.42),

    0 0 0 0.5px rgba(255,255,255,0.04)
  `,

  isolation: 'isolate',
};

/* ───────────────────────────────────────────── */
/* REFRACTION LAYERS                            */
/* ───────────────────────────────────────────── */
const LiquidGlass = ({ radius }: { radius: number | string }) => {
  return (
    <>
      {/* MAIN REFRACTION */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: -20,
          borderRadius: radius,
          pointerEvents: 'none',
          zIndex: 0,

          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',

          opacity: 0.9,
        }}
      />

      {/* EDGE DISTORTION */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: radius,
          pointerEvents: 'none',
          zIndex: 1,

          background: `
            radial-gradient(
              circle at top left,
              rgba(255,255,255,0.10),
              transparent 28%
            ),

            radial-gradient(
              circle at top right,
              rgba(255,255,255,0.08),
              transparent 24%
            ),

            radial-gradient(
              circle at bottom center,
              rgba(255,255,255,0.04),
              transparent 40%
            )
          `,

          mixBlendMode: 'screen',

          filter: 'blur(18px)',
        }}
      />

      {/* CURVED REFLECTION */}
      <span
        aria-hidden
        style={{
          position: 'absolute',

          left: '12%',
          right: '12%',
          top: 2,

          height: '42%',

          borderRadius: '999px',

          background: `
            radial-gradient(
              ellipse at top,
              rgba(255,255,255,0.14) 0%,
              rgba(255,255,255,0.05) 36%,
              rgba(255,255,255,0.015) 54%,
              transparent 72%
            )
          `,

          filter: 'blur(12px)',

          zIndex: 2,

          opacity: 0.75,

          pointerEvents: 'none',
        }}
      />

      {/* OUTER EDGE */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: radius,
          pointerEvents: 'none',
          zIndex: 4,

          boxShadow: `
            inset 0 0 0 1px rgba(255,255,255,0.045)
          `,
        }}
      />
    </>
  );
};

/* ───────────────────────────────────────────── */
/* ACTIVE LIQUID PILL                           */
/* ───────────────────────────────────────────── */
const activePillStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 3,
  borderRadius: 999,

  background: `
    linear-gradient(
      180deg,
      rgba(0, 255, 255, 0.22) 0%,
      rgba(0, 200, 200, 0.18) 50%,
      rgba(0, 150, 150, 0.16) 100%
    )
  `,

  backdropFilter: 'blur(26px) saturate(180%)',
  WebkitBackdropFilter: 'blur(26px) saturate(180%)',

  border: '1px solid rgba(180, 255, 255, 0.10)',

  boxShadow: `
    inset 0 1px 0 rgba(255,255,255,0.10),
    inset 0 -10px 18px rgba(0, 120, 120, 0.18)
  `,

  overflow: 'hidden',
};

const ActiveLiquidEffects = () => (
  <>
    {/* REFRACTION */}
    <span
      style={{
        position: 'absolute',
        inset: -10,

        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',

        opacity: 0.9,
      }}
    />

    {/* INTERNAL REFLECTION */}
    <span
      style={{
        position: 'absolute',

        left: '10%',
        right: '10%',
        top: 2,

        height: '42%',

        borderRadius: '999px',

        background: `
          radial-gradient(
            ellipse at top,
            rgba(255,255,255,0.24) 0%,
            rgba(255,255,255,0.10) 35%,
            transparent 70%
          )
        `,

        filter: 'blur(10px)',
      }}
    />

    {/* BLUE EDGE GLOW */}
    <span
      style={{
        position: 'absolute',
        inset: 0,

        borderRadius: 999,

        boxShadow: `
          inset 0 0 0 1px rgba(180,220,255,0.12),

          0 0 18px rgba(0,122,255,0.26),

          0 0 38px rgba(0,122,255,0.18)
        `,
      }}
    />
  </>
);

/* ───────────────────────────────────────────── */

export const BottomBar = () => {
  const pathname = usePathname();

  const t = useTranslations('BottomBar');

  const haptic = useHaptic();

  const isChat = /^\/chats\/.+/.test(pathname);

  if (isChat) return null;

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const midItems = [
    {
      id: 2,
      href: '/models',
      label: t('models'),
      icon: Brain,
    },
    {
      id: 3,
      href: '/generate',
      label: t('create'),
      icon: Sparkles,
    },
    {
      id: 4,
      href: '/chats',
      label: t('chats'),
      icon: MessageCircle,
    },
  ] as const;

  return (
    <nav className="fixed bottom-3 left-0 right-0 z-50 flex justify-center px-3 sm:hidden">
      <div className="flex w-full max-w-sm items-center gap-2">
        {/* HOME */}
        <Link
          href="/"
          onClick={() => haptic.selection()}
          className="flex h-14 flex-col items-center justify-center gap-1 no-underline"
          style={{
            ...glassBase,
            borderRadius: 9999,
            flex: '0 0 64px',
          }}
        >
          <LiquidGlass radius={9999} />

          <AnimatePresence>
            {isActive('/') && (
              <motion.span
                key="home-active"
                initial={{
                  opacity: 0,
                  scale: 0.84,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  scale: 0.84,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                }}
                style={{
                  ...activePillStyle,
                  zIndex: 0,
                }}
              >
                <ActiveLiquidEffects />
              </motion.span>
            )}
          </AnimatePresence>

          <motion.span
            animate={{
              scale: isActive('/') ? 1 : 0.92,
            }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 28,
            }}
            style={{
              position: 'relative',
              zIndex: 10,
              display: 'flex',
            }}
          >
            <Home
              size={20}
              color={isActive('/') ? ACCENT : INACTIVE_ICON}
              fill={isActive('/') ? ACCENT : INACTIVE_ICON}
              strokeWidth={0}
            />
          </motion.span>

          <motion.span
            animate={{
              color: isActive('/') ? ACCENT : INACTIVE_LABEL,
            }}
            transition={{
              duration: 0.16,
            }}
            style={{
              position: 'relative',
              zIndex: 10,
              fontSize: 10,
              lineHeight: 1,
              fontWeight: isActive('/') ? 600 : 400,
            }}
          >
            {t('home')}
          </motion.span>
        </Link>

        {/* MID PILL */}
        <div
          className="flex h-14 flex-1 items-center justify-around"
          style={{
            ...glassBase,
            borderRadius: 999,
          }}
        >
          <LiquidGlass radius={999} />

          {midItems.map((item) => {
            const active = isActive(item.href);

            const Icon = item.icon;

            const isCreate = item.id === 3;

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => {
                  if (isCreate) haptic.medium();
                  else haptic.selection();
                }}
                className="relative flex h-full flex-1 flex-col items-center justify-center gap-1 no-underline"
                style={{
                  borderRadius: 999,
                }}
              >
                <AnimatePresence>
                  {active && (
                    <motion.span
                      key={`active-${item.id}`}
                      layoutId="liquid-pill"
                      initial={{
                        opacity: 0,
                        scale: 0.82,
                      }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                      }}
                      exit={{
                        opacity: 0,
                        scale: 0.82,
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 420,
                        damping: 30,
                      }}
                      style={{
                        ...activePillStyle,
                        zIndex: 0,
                      }}
                    >
                      <ActiveLiquidEffects />
                    </motion.span>
                  )}
                </AnimatePresence>

                <motion.span
                  animate={{
                    scale: active ? 1 : 0.9,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 420,
                    damping: 28,
                  }}
                  style={{
                    position: 'relative',
                    zIndex: 10,
                    display: 'flex',
                  }}
                >
                  <Icon
                    size={isCreate ? 21 : 19}
                    color={active ? ACCENT : INACTIVE_ICON}
                    fill={active ? ACCENT : INACTIVE_ICON}
                    strokeWidth={0}
                  />
                </motion.span>

                <motion.span
                  animate={{
                    color: active ? ACCENT : INACTIVE_LABEL,
                  }}
                  transition={{
                    duration: 0.16,
                  }}
                  style={{
                    position: 'relative',
                    zIndex: 10,
                    fontSize: 10,
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {item.label}
                </motion.span>
              </Link>
            );
          })}
        </div>

        {/* PROFILE */}
        <Link
          href="/profile"
          onClick={() => haptic.selection()}
          className="flex h-14 flex-col items-center justify-center gap-1 no-underline"
          style={{
            ...glassBase,
            borderRadius: 9999,
            flex: '0 0 64px',
          }}
        >
          <LiquidGlass radius={9999} />

          <AnimatePresence>
            {isActive('/profile') && (
              <motion.span
                key="profile-active"
                initial={{
                  opacity: 0,
                  scale: 0.84,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  scale: 0.84,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                }}
                style={{
                  ...activePillStyle,
                  zIndex: 0,
                }}
              >
                <ActiveLiquidEffects />
              </motion.span>
            )}
          </AnimatePresence>

          <motion.span
            animate={{
              scale: isActive('/profile') ? 1 : 0.92,
            }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 28,
            }}
            style={{
              position: 'relative',
              zIndex: 10,
              display: 'flex',
            }}
          >
            <UserRound
              size={20}
              color={isActive('/profile') ? ACCENT : INACTIVE_ICON}
              fill={isActive('/profile') ? ACCENT : INACTIVE_ICON}
              strokeWidth={0}
            />
          </motion.span>

          <motion.span
            animate={{
              color: isActive('/profile') ? ACCENT : INACTIVE_LABEL,
            }}
            transition={{
              duration: 0.16,
            }}
            style={{
              position: 'relative',
              zIndex: 10,
              fontSize: 10,
              lineHeight: 1,
              fontWeight: isActive('/profile') ? 600 : 400,
            }}
          >
            {t('profile')}
          </motion.span>
        </Link>
      </div>
    </nav>
  );
};