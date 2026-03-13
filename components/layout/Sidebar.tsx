'use client';

import Link from 'next/link';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';

import { Brain, Home, MessageCircle, Sparkle, UserRound } from 'lucide-react';
import Image from 'next/image';

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

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) router.replace('/login');
  }, [router]);

  const isActive = (url: string) => {
    return pathname === url || pathname!.startsWith(url + '/');
  };

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarContent className="rounded-xl py-1 backdrop-blur-xl bg-white/80 dark:bg-neutral-950/80">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-xs uppercase tracking-wider text-muted-foreground">
            <Image
              src="/logo.png"
              alt="logo"
              width={200}
              height={200}
              className="invert"
            />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {items.map((item) => {
                const active = isActive(item.href);
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                    >
                      <Link
                        href={item.href}
                        className={`${item.id === 3 ? 'bg-slate-800/50 text-slate-400 shadow-xl shadow-slate-600' : ''}`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
