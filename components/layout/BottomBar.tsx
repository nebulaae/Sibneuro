// sibneuro bottombar
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

  const homeItem = items[0];
  const midItems = items.slice(1, 4);
  const profileItem = items[4];

  // Teal accent
  const ACCENT = 'oklch(62.3% 0.214 259.815)';

  return (
    <nav
      aria-label={t('ariaLabel')}
      className={cn(
        'flex sm:hidden fixed bottom-2 left-0 right-0 z-50 justify-center px-2',
        'transition-transform duration-380 ease-[cubic-bezier(0.32,0.72,0,1)]',
        !visible && 'translate-y-[120%]'
      )}
    >
      <div className="flex items-center gap-1 justify-center w-full">
        {/* Home bubble */}
        <Link
          href={homeItem.href}
          onClick={() => haptic.selection()}
          className={cn(
            'max-w-18 w-full h-12 rounded-full flex flex-col items-center justify-center gap-0.5',
            'select-none no-underline transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
            'active:scale-90',
            "bg-black/20 backdrop-blur-3xl backdrop-saturate-200",
            "border border-white/[.14]",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_60px_rgba(0,0,0,0.65),0_4px_16px_rgba(0,0,0,0.4)]"
          )}
        >
          <Home
            size={20}
            strokeWidth={isActive(homeItem.href) ? 2.2 : 1.6}
            style={{ color: isActive(homeItem.href) ? ACCENT : 'rgba(255,255,255,0.45)' }}
            className="transition-all duration-250"
          />
          <span
            className="text-[9px] font-medium leading-none transition-all duration-250"
            style={{ color: isActive(homeItem.href) ? ACCENT : 'rgba(255,255,255,0.35)' }}
          >
            {homeItem.label}
          </span>
        </Link>

        {/* Mid items */}
        <div className={cn("flex items-center justify-center gap-0.5 rounded-3xl",
          "bg-black/20 backdrop-blur-3xl backdrop-saturate-200",
          "border border-white/[.14]",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_60px_rgba(0,0,0,0.65),0_4px_16px_rgba(0,0,0,0.4)]")}>
          {midItems.map((item) => {
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
                  'flex flex-col items-center gap-1 px-4 py-2 rounded-2xl',
                  'select-none no-underline transition-all duration-280 ease-[cubic-bezier(0.32,0.72,0,1)]',
                  'active:scale-[0.88]',
                )}
                style={active ? {
                  background: 'oklch(62.3% 0.214 259.815 / 0.12)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
                } : {}}
              >
                <Icon
                  size={18}
                  strokeWidth={active ? 2.2 : 1.5}
                  style={{ color: active ? ACCENT : 'rgba(255,255,255,0.40)' }}
                  className="transition-all duration-250"
                />
                <span
                  className="text-[9.5px] font-medium leading-none whitespace-nowrap transition-all duration-250"
                  style={{ color: active ? ACCENT : 'rgba(255,255,255,0.30)' }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Profile bubble */}
        <Link
          href={profileItem.href}
          onClick={() => haptic.selection()}
          className={cn(
            'max-w-18 w-full h-12 rounded-full flex flex-col items-center justify-center gap-0.5',
            'select-none no-underline transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
            'active:scale-90',
            "bg-black/20 backdrop-blur-3xl backdrop-saturate-200",
            "border border-white/[.14]",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_60px_rgba(0,0,0,0.65),0_4px_16px_rgba(0,0,0,0.4)]"
          )}
        >
          <UserRound
            size={20}
            strokeWidth={isActive(profileItem.href) ? 2.2 : 1.6}
            style={{ color: isActive(profileItem.href) ? ACCENT : 'rgba(255,255,255,0.45)' }}
            className="transition-all duration-250"
          />
          <span
            className="text-[9px] font-medium leading-none transition-all duration-250"
            style={{ color: isActive(profileItem.href) ? ACCENT : 'rgba(255,255,255,0.35)' }}
          >
            {profileItem.label}
          </span>
        </Link>
      </div>
    </nav>
  );
};