'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Brain, Sparkles, MessageCircle, UserRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHaptic } from '@/hooks/useHaptic';
import { useTranslations } from 'next-intl';

const ACCENT = '#007AFF';
const INACTIVE_ICON = 'rgba(255,255,255,0.50)';
const INACTIVE_LABEL = 'rgba(255,255,255,0.38)';

// Shared glass surface style — dark frosted, inner diagonal highlight
const glass = {
  background: 'rgba(26, 26, 28, 0.70)',
  backdropFilter: 'blur(32px) saturate(180%)',
  WebkitBackdropFilter: 'blur(32px) saturate(180%)',
  border: '0.5px solid rgba(255,255,255,0.11)',
  boxShadow: `
    inset 1px 1px 0px rgba(255,255,255,0.16),
    inset -1px -1px 0px rgba(0,0,0,0.28),
    0 8px 32px rgba(0,0,0,0.50),
    0 2px 8px rgba(0,0,0,0.30)
  `,
} as React.CSSProperties;

export const BottomBar = () => {
  const t = useTranslations('BottomBar');
  const pathname = usePathname();
  const haptic = useHaptic();

  const isChat = /^\/chats\/.+/.test(pathname);
  if (isChat) return null;

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const midItems = [
    { id: 2, href: '/models', label: t('models'), icon: Brain },
    { id: 3, href: '/generate', label: t('create'), icon: Sparkles },
    { id: 4, href: '/chats', label: t('chats'), icon: MessageCircle },
  ] as const;

  return (
    <nav
      aria-label={t('ariaLabel')}
      className="flex sm:hidden fixed bottom-3 left-0 right-0 z-50 justify-center px-3"
    >
      <div className="flex items-center gap-2 w-full max-w-sm">

        {/* ── Home bubble ── */}
        <Link
          href="/"
          onClick={() => haptic.selection()}
          style={{ ...glass, borderRadius: 9999, flex: '0 0 64px' }}
          className="h-14 flex flex-col items-center justify-center gap-1 no-underline select-none relative overflow-hidden"
        >
          <AnimatePresence>
            {isActive('/') && (
              <motion.span
                key="home-bg"
                layoutId="bubble-home"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 9999,
                  background: 'rgba(0,122,255,0.18)',
                  boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.12)',
                }}
              />
            )}
          </AnimatePresence>
          <motion.span
            animate={{
              color: isActive('/') ? ACCENT : INACTIVE_ICON,
              scale: isActive('/') ? 1 : 0.92,
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            style={{ position: 'relative', display: 'flex' }}
          >
            <Home
              size={20}
              fill={isActive('/') ? ACCENT : INACTIVE_ICON}
              strokeWidth={0}
            />
          </motion.span>
          <motion.span
            animate={{ color: isActive('/') ? ACCENT : INACTIVE_LABEL }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'relative',
              fontSize: 10,
              fontWeight: isActive('/') ? 600 : 400,
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}
          >
            {t('home')}
          </motion.span>
        </Link>

        {/* ── Mid pill: Models / Create / Chats ── */}
        <div
          style={{ ...glass, borderRadius: 28, flex: 1 }}
          className="h-14 flex items-center justify-around px-px relative overflow-hidden"
        >
          {midItems.map(item => {
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
                className="flex-1 flex flex-col items-center justify-center gap-1 no-underline select-none relative h-full"
                style={{ borderRadius: 999 }}
              >
                <AnimatePresence>
                  {active && (
                    <motion.span
                      key={`bg-${item.id}`}
                      layoutId="mid-active-bg"
                      initial={{ opacity: 0, scale: 0.75 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.75 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      style={{
                        position: 'absolute',
                        inset: 4,
                        borderRadius: 999,
                        background: 'rgba(0,122,255,0.16)',
                        boxShadow: `
                          inset 1px 1px 0 rgba(255,255,255,0.13),
                          inset -1px -1px 0 rgba(0,0,0,0.20)
                        `,
                      }}
                    />
                  )}
                </AnimatePresence>
                <motion.span
                  animate={{
                    scale: active ? 1 : 0.88,
                    filter: active
                      ? 'drop-shadow(0 0 5px rgba(0,122,255,0.60))'
                      : 'drop-shadow(0 0 0px transparent)',
                  }}
                  transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                  style={{ position: 'relative', display: 'flex' }}
                >
                  <Icon
                    size={isCreate ? 21 : 19}
                    fill={active ? ACCENT : INACTIVE_ICON}
                    strokeWidth={0}
                  />
                </motion.span>
                <motion.span
                  animate={{ color: active ? ACCENT : INACTIVE_LABEL }}
                  transition={{ duration: 0.18 }}
                  style={{
                    position: 'relative',
                    fontSize: 10,
                    fontWeight: active ? 600 : 400,
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.label}
                </motion.span>
              </Link>
            );
          })}
        </div>

        {/* ── Profile bubble ── */}
        <Link
          href="/profile"
          onClick={() => haptic.selection()}
          style={{ ...glass, borderRadius: 9999, flex: '0 0 64px' }}
          className="h-14 flex flex-col items-center justify-center gap-1 no-underline select-none relative overflow-hidden"
        >
          <AnimatePresence>
            {isActive('/profile') && (
              <motion.span
                key="profile-bg"
                layoutId="bubble-profile"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 9999,
                  background: 'rgba(0,122,255,0.18)',
                  boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.12)',
                }}
              />
            )}
          </AnimatePresence>
          <motion.span
            animate={{
              color: isActive('/profile') ? ACCENT : INACTIVE_ICON,
              scale: isActive('/profile') ? 1 : 0.92,
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            style={{ position: 'relative', display: 'flex' }}
          >
            <UserRound
              size={20}
              fill={isActive('/profile') ? ACCENT : INACTIVE_ICON}
              strokeWidth={0}
            />
          </motion.span>
          <motion.span
            animate={{ color: isActive('/profile') ? ACCENT : INACTIVE_LABEL }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'relative',
              fontSize: 10,
              fontWeight: isActive('/profile') ? 600 : 400,
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}
          >
            {t('profile')}
          </motion.span>
        </Link>

      </div>
    </nav>
  );
};