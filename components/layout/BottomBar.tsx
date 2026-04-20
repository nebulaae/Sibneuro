'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Home, Brain, Sparkles, MessageCircle, UserRound } from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export const BottomBar = () => {
  const t = useTranslations('BottomBar');
  const pathname = usePathname();
  const haptic = useHaptic();
  const [visible, setVisible] = useState(true);

  const items = [
    { id: 1, href: '/', label: t('home'), icon: Home },
    { id: 2, href: '/models', label: t('models'), icon: Brain },
    { id: 3, href: '/generate', label: t('create'), icon: Sparkles },
    { id: 4, href: '/chats', label: t('chats'), icon: MessageCircle },
    { id: 5, href: '/profile', label: t('profile'), icon: UserRound },
  ] as const;

  // Скрываем внутри конкретного чата
  const isChat = /^\/chats\/.+/.test(pathname);

  const handleScroll = useCallback(() => {
    let lastY = 0;
    let timer: ReturnType<typeof setTimeout>;

    const onScroll = () => {
      const curr = window.scrollY;
      setVisible(curr <= lastY || curr < 80);
      lastY = curr;
      clearTimeout(timer);
      timer = setTimeout(() => setVisible(true), 1500);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (isChat) return;
    const cleanup = handleScroll();
    const onActivity = () => setVisible(true);
    ['touchstart', 'mousedown'].forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true })
    );
    return () => {
      cleanup();
      ['touchstart', 'mousedown'].forEach((e) =>
        window.removeEventListener(e, onActivity)
      );
    };
  }, [isChat, handleScroll]);

  if (isChat) return null;

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <nav
      aria-label={t('ariaLabel')}
      className={cn(
        // Только на мобилке
        'flex sm:hidden fixed bottom-0 left-0 right-0 z-50',
        'justify-center px-4',
        // safe-area для iPhone
        'pb-[max(12px,env(safe-area-inset-bottom))]',
        'transition-transform duration-380 ease-[cubic-bezier(0.32,0.72,0,1)]',
        !visible && 'translate-y-[120%]'
      )}
    >
      {/* Pill */}
      <div
        className={cn(
          'flex items-center w-full max-w-100 gap-0.5',
          'px-1 py-1.5 rounded-full',
          // Liquid Glass chrome
          'bg-black/72 backdrop-blur-3xl backdrop-saturate-200',
          'border border-white/20',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_12px_40px_rgba(0,0,0,0.42)]'
        )}
      >
        {items.map((item) => {
          const active = isActive(item.href);
          const isCreate = item.id === 3;
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => {
                if (isCreate) haptic.medium();
                else haptic.selection();
              }}
              className={cn(
                'flex-1 flex flex-col items-center gap-1',
                'rounded-full select-none no-underline',
                '-webkit-tap-highlight-color-transparent',
                'transition-all duration-280 ease-[cubic-bezier(0.32,0.72,0,1)]',
                'active:scale-[0.88]',
                active || isCreate ? 'text-white' : 'text-white/50'
              )}
            >
              {/* Icon bubble */}
              <div
                className={cn(
                  'w-full h-full py-1 flex flex-col items-center justify-center rounded-full',
                  'transition-all duration-280 ease-[cubic-bezier(0.32,0.72,0,1)]',
                  isCreate
                    ? cn(
                        'bg-[rgba(0,122,255,0.85)] backdrop-blur-xl',
                        'border border-[rgba(0,122,255,0.30)]',
                        'shadow-[inset_0_1px_0_rgba(255,255,255,0.40),0_4px_16px_rgba(0,122,255,0.42)]',
                        'text-white'
                      )
                    : active
                      ? cn(
                          'bg-white/[.14] backdrop-blur-xl',
                          'border border-white/[.14]',
                          'shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
                        )
                      : ''
                )}
              >
                <Icon size={16} strokeWidth={active || isCreate ? 2.2 : 1.6} />
                {/* Label */}
                <span className="text-[10px] font-thin tracking-[0.1px] leading-none whitespace-nowrap">
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
