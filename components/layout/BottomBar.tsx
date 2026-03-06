'use client';
import Link from 'next/link';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Brain, Home, MessageCircle, Sparkle, UserRound } from 'lucide-react';

export const BottomBar = () => {
  const pathname = usePathname();
  const router = useRouter();

  const [isBottomBarVisible, setIsBottomBarVisible] = useState(true);
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [open, setOpen] = useState(false);

  // ---------- items ----------
  const items = [
    {
      id: 1,
      href: '/',
      label: 'Главная',
      icon: Home,
    },
    {
      id: 2,

      href: '/models',
      label: 'Модели',
      icon: Brain,
    },
    {
      id: 3,

      href: '/generate',
      label: 'Создать',
      icon: Sparkle,
    },
    {
      id: 4,

      href: '/chats',
      label: 'Чаты',
      icon: MessageCircle,
    },
    {
      id: 5,
      href: '/profile',
      label: 'Профиль',
      icon: UserRound,
    },
  ];

  useEffect(() => {
    let idleTimer: NodeJS.Timeout;
    let lastScrollY = window.scrollY;

    const hide = () => {
      setIsBottomBarVisible(false);
      setOpen(false);
    };

    const show = () => {
      setIsBottomBarVisible(true);
    };

    const resetTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(hide, 3000);
    };

    const handleUserActivity = () => {
      show();
      resetTimer();
    };

    const handleScroll = () => {
      const current = window.scrollY;

      // если скролл вниз — скрываем сразу
      if (current > lastScrollY && current > 80) {
        hide();
      } else {
        show();
      }

      lastScrollY = current;

      resetTimer(); // любой скролл = активность
    };

    const activityEvents: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'touchstart',
      'keydown',
    ];

    activityEvents.forEach((event) =>
      window.addEventListener(event, handleUserActivity, { passive: true })
    );

    window.addEventListener('scroll', handleScroll, { passive: true });

    resetTimer(); // старт

    return () => {
      clearTimeout(idleTimer);
      activityEvents.forEach((event) =>
        window.removeEventListener(event, handleUserActivity)
      );
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const bottomBarStyle = {
    transform: isBottomBarVisible ? 'translateY(0)' : 'translateY(120%)',
    transition: 'transform .35s cubic-bezier(.4,0,.2,1)',
  };

  return (
    <nav
      style={bottomBarStyle}
      className="fixed md:hidden flex items-center justify-center left-0 right-0 bottom-0 z-10 w-full max-w-80 mx-auto px-3 pb-2"
    >
      <div className="flex items-center justify-evenly w-full rounded-full border border-border/50 py-1 backdrop-blur-xl bg-white/80 dark:bg-neutral-950/80">
        {items.map((item) => (
          <Link
            href={item.href}
            key={item.id}
            className={`flex flex-col gap-0.5 items-center justify-center rounded-lg p-2 transition-all duration-200 
                            ${
                              pathname === item.href
                                ? 'text-foreground'
                                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground active:scale-95'
                            }
                            ${item.id === 3 ? 'bg-slate-800/50 text-slate-400 shadow-2xl shadow-slate-600' : ''}
                            `}
          >
            <item.icon
              strokeWidth={pathname === item.href ? 2 : 1.5}
              className="size-5"
            />
            <span className="text-[10px] font-medium leading-tight">
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
};
