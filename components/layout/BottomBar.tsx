'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Brain, Sparkles, MessageCircle, UserRound } from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useHaptic } from '@/hooks/useHaptic';

const ACCENT = '#22d3ee';

const INACTIVE_ICON = 'rgba(255,255,255,0.42)';
const INACTIVE_LABEL = 'rgba(255,255,255,0.30)';

/* ───────────────────────────────────────────── */
/* REAL LIQUID GLASS                            */
/* ───────────────────────────────────────────── */

const glassBase: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',

  // More transparent → more of the page shows through the glass
  background: 'rgba(16,16,18,0.20)',

  // Lighter blur → more "reflective"/see-through, less frosted
  backdropFilter: 'blur(10px) saturate(150%)',
  WebkitBackdropFilter: 'blur(10px) saturate(150%)',

  border: '1px solid rgba(255,255,255,0.06)',

  // Flatter: softened top inset highlight, no bulge
  boxShadow: `
    inset 0 0.5px 0 rgba(255,255,255,0.07),

    0 8px 30px rgba(0,0,0,0.36),

    0 0 0 0.5px rgba(255,255,255,0.03)
  `,

  isolation: 'isolate',
};

/* ───────────────────────────────────────────── */
/* REFRACTION LAYERS                            */
/* ───────────────────────────────────────────── */
const LiquidGlass = ({ radius }: { radius: number | string }) => {
  return (
    <>
      {/* MAIN REFRACTION — lighter blur lets more show through */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: -20,
          borderRadius: radius,
          pointerEvents: 'none',
          zIndex: 0,

          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',

          opacity: 0.65,
        }}
      />

      {/* EDGE DISTORTION — toned down so it reads flat, not bulging */}
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
              rgba(255,255,255,0.05),
              transparent 26%
            ),

            radial-gradient(
              circle at top right,
              rgba(255,255,255,0.04),
              transparent 22%
            )
          `,

          mixBlendMode: 'screen',

          filter: 'blur(16px)',
        }}
      />

      {/* TOP SHEEN — thin, flat highlight (no convex dome) */}
      <span
        aria-hidden
        style={{
          position: 'absolute',

          left: '8%',
          right: '8%',
          top: 1,

          height: '22%',

          borderRadius: '999px',

          background: `
            linear-gradient(
              180deg,
              rgba(255,255,255,0.08) 0%,
              rgba(255,255,255,0.02) 60%,
              transparent 100%
            )
          `,

          filter: 'blur(6px)',

          zIndex: 2,

          opacity: 0.5,

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

  background: 'rgba(34, 211, 238, 0.10)',


  backdropFilter: 'blur(12px) saturate(160%)',

  overflow: 'hidden',
};

const ActiveLiquidEffects = () => (
  <>
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
    <nav className="fixed bottom-3 left-0 right-0 z-50 flex justify-center px-3 md:hidden">
      <div className="flex w-full max-w-sm items-center gap-1">
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
            animate={
              isActive('/') ? { scale: [0.9, 1.18, 1] } : { scale: 0.92 }
            }
            transition={
              isActive('/')
                ? {
                  duration: 0.42,
                  times: [0, 0.55, 1],
                  ease: [0.34, 1.56, 0.64, 1],
                }
                : { type: 'spring', stiffness: 400, damping: 28 }
            }
            style={{
              position: 'relative',
              zIndex: 10,
              display: 'flex',
            }}
          >
            <Home
              size={21}
              color={isActive('/') ? ACCENT : INACTIVE_ICON}
              fill="none"
              strokeWidth={2}
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
                  animate={
                    active ? { scale: [0.9, 1.18, 1] } : { scale: 0.9 }
                  }
                  transition={
                    active
                      ? {
                        duration: 0.42,
                        times: [0, 0.55, 1],
                        ease: [0.34, 1.56, 0.64, 1],
                      }
                      : { type: 'spring', stiffness: 420, damping: 28 }
                  }
                  style={{
                    position: 'relative',
                    zIndex: 10,
                    display: 'flex',
                  }}
                >
                  <Icon
                    size={isCreate ? 22 : 20}
                    color={active ? ACCENT : INACTIVE_ICON}
                    fill="none"
                    strokeWidth={2}
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
            animate={
              isActive('/profile')
                ? { scale: [0.9, 1.18, 1] }
                : { scale: 0.92 }
            }
            transition={
              isActive('/profile')
                ? {
                  duration: 0.42,
                  times: [0, 0.55, 1],
                  ease: [0.34, 1.56, 0.64, 1],
                }
                : { type: 'spring', stiffness: 400, damping: 28 }
            }
            style={{
              position: 'relative',
              zIndex: 10,
              display: 'flex',
            }}
          >
            <UserRound
              size={21}
              color={isActive('/profile') ? ACCENT : INACTIVE_ICON}
              fill="none"
              strokeWidth={2}
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
