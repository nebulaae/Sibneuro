'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Home, Brain, Sparkles, MessageCircle, UserRound } from 'lucide-react';

const items = [
  { id: 1, href: '/', label: 'Главная', icon: Home },
  { id: 2, href: '/models', label: 'Модели', icon: Brain },
  { id: 3, href: '/generate', label: 'Создать', icon: Sparkles },
  { id: 4, href: '/chats', label: 'Чаты', icon: MessageCircle },
  { id: 5, href: '/profile', label: 'Профиль', icon: UserRound },
];

const spring = 'all 0.28s cubic-bezier(0.32, 0.72, 0, 1)';

export const BottomBar = () => {
  const pathname = usePathname();

  // Hide in individual chat page
  const isChat = /^\/chats\/.+/.test(pathname);
  if (isChat) return null;

  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let lastY = window.scrollY;
    let timer: ReturnType<typeof setTimeout>;

    const onScroll = () => {
      const curr = window.scrollY;
      setVisible(curr <= lastY || curr < 80);
      lastY = curr;
      clearTimeout(timer);
      timer = setTimeout(() => setVisible(true), 1500);
    };

    const onActivity = () => {
      setVisible(true);
      clearTimeout(timer);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    ['touchstart', 'mousedown'].forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true })
    );

    return () => {
      window.removeEventListener('scroll', onScroll);
      ['touchstart', 'mousedown'].forEach((e) =>
        window.removeEventListener(e, onActivity)
      );
      clearTimeout(timer);
    };
  }, []);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      {/*
        ─── Mobile bottom bar (hidden on md+) ───
        Fixed to bottom, shows a floating pill with glass chrome material.
      */}
      <nav
        className="md:hidden"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 50,
          display: 'flex',
          justifyContent: 'center',
          /* horizontal padding so pill doesn't touch screen edges */
          padding: '0 16px',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          transform: visible ? 'translateY(0)' : 'translateY(120%)',
          transition: 'transform 0.38s cubic-bezier(0.32, 0.72, 0, 1)',
          /* no background here — pill itself has glass */
        }}
      >
        {/* Pill container */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            /* pill grows to fill available space but caps at 400px */
            width: '100%',
            maxWidth: 400,
            padding: '7px 8px',
            borderRadius: 9999,
            background: 'var(--glass-chrome)',
            backdropFilter: 'var(--blur-chrome) var(--vibrancy)',
            WebkitBackdropFilter: 'var(--blur-chrome) var(--vibrancy)',
            border: 'var(--glass-border-thick)',
            boxShadow: 'var(--glass-specular), var(--glass-shadow-lg)',
          }}
        >
          {items.map((item) => {
            const active = isActive(item.href);
            const isCreate = item.id === 3;

            return (
              <Link
                key={item.id}
                href={item.href}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  padding: '5px 2px',
                  borderRadius: 9999,
                  textDecoration: 'none',
                  transition: spring,
                  willChange: 'transform',
                  color:
                    active || isCreate
                      ? 'var(--sys-label)'
                      : 'var(--sys-label-secondary)',
                  WebkitTapHighlightColor: 'transparent',
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
                {/* Icon container */}
                <div
                  style={{
                    width: '100%',
                    minWidth: 36,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 9999,
                    transition: spring,
                    ...(isCreate
                      ? {
                          background: 'rgba(0,122,255,0.85)',
                          backdropFilter: 'blur(20px)',
                          WebkitBackdropFilter: 'blur(20px)',
                          border: '1px solid rgba(0,122,255,0.3)',
                          boxShadow:
                            'inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 16px rgba(0,122,255,0.4)',
                          color: '#fff',
                        }
                      : active
                      ? {
                          background: 'var(--glass-regular)',
                          backdropFilter: 'blur(30px)',
                          WebkitBackdropFilter: 'blur(30px)',
                          border: 'var(--glass-border-thin)',
                          boxShadow: 'var(--glass-specular), var(--glass-shadow-sm)',
                        }
                      : {}),
                  }}
                >
                  <item.icon
                    size={16}
                    strokeWidth={active || isCreate ? 2.2 : 1.6}
                  />
                </div>

                {/* Label */}
                <span
                  style={{
                    fontSize: '9.5px',
                    fontWeight: 600,
                    letterSpacing: '0.1px',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/*
        ─── Desktop tab bar (hidden on mobile, shown on md+) ───
        A slim bar pinned to bottom-left inside the sidebar area,
        OR simply hidden because the Sidebar component handles desktop nav.
        We render nothing here — the AppSidebar covers desktop.
        But if you ever need a desktop tab strip, add it here inside "hidden md:flex".
      */}
    </>
  );
};