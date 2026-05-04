'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Brain, Home, MessageCircle, Sparkle, UserRound } from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export function AppSidebar() {
  const t = useTranslations('Sidebar');
  const pathname = usePathname();
  const router = useRouter();
  const haptic = useHaptic();

  const [collapsible, setCollapsible] = useState<'icon' | 'offcanvas'>(
    'offcanvas'
  );

  useEffect(() => {
    const handleResize = () => {
      setCollapsible(window.innerWidth >= 1024 ? 'offcanvas' : 'icon');
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const items = [
    { id: 1, href: '/', label: t('home'), icon: Home },
    { id: 2, href: '/models', label: t('models'), icon: Brain },
    { id: 3, href: '/generate', label: t('create'), icon: Sparkle },
    { id: 4, href: '/chats', label: t('chats'), icon: MessageCircle },
    { id: 5, href: '/profile', label: t('profile'), icon: UserRound },
  ] as const;

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) router.replace('/login');
  }, [router]);

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href + '/'));

  return (
    <Sidebar variant="floating" collapsible={collapsible} className="bg-transparent!">
      <SidebarContent className="bg-neutral-950 rounded-3xl">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {items.map((item) => {
                const active = isActive(item.href);
                const isCreate = item.id === 3;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                    >
                      <Link
                        href={item.href}
                        onClick={() =>
                          isCreate ? haptic.medium() : haptic.selection()
                        }
                        className={cn(
                          'group flex items-center gap-3 rounded-xl py-2.5',
                          'text-[14px] font-medium transition-all duration-200',
                          'active:scale-[0.96]',
                          active
                            ? 'bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
                            : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                        )}
                      >
                        <item.icon
                          className={cn(
                            'shrink-0 h-5 w-5',
                            active
                              ? 'text-white'
                              : 'text-white/40 group-hover:text-white/70'
                          )}
                        />
                        <span className="truncate">{item.label}</span>
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
