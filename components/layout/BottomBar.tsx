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

export const BottomBar = () => {
  const pathname = usePathname();

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
      timer = setTimeout(() => setVisible(true), 3000);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    ['touchstart', 'mousedown', 'keydown'].forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true })
    );

    return () => {
      window.removeEventListener('scroll', onScroll);
      ['touchstart', 'mousedown', 'keydown'].forEach((e) =>
        window.removeEventListener(e, onActivity)
      );
      clearTimeout(timer);
    };
  }, []);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <nav
      className="fixed md:hidden left-0 right-0 bottom-0 z-50 flex justify-center px-3 pb-3"
      style={{
        transform: visible ? 'translateY(0)' : 'translateY(120%)',
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      <div className="flex items-center justify-evenly w-full max-w-[min(320px,calc(100vw-1rem))] rounded-3xl border border-border/40 py-1.5 px-1 backdrop-blur-2xl bg-background/85 shadow-2xl shadow-black/30">
        {items.map((item) => {
          const active = isActive(item.href);
          const isCreate = item.id === 3;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-2xl transition-all duration-200 active:scale-90 ${isCreate
                  ? 'bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30 px-3'
                  : active
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <item.icon
                className="size-5"
                strokeWidth={active || isCreate ? 2.2 : 1.6}
              />
              <span className="text-[9px] font-semibold leading-none tracking-wide">
                {item.label}
              </span>
              {active && !isCreate && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
