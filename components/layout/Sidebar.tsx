'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
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
    pathname === href || pathname.startsWith(href + '/');

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarContent
        className={cn(
          'rounded-xl py-1',
          'bg-black/65 backdrop-blur-3xl backdrop-saturate-200',
          'border border-white/22',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_32px_rgba(0,0,0,0.38)]'
        )}
      >
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 py-2">
            <Image
              src="/logo.png"
              alt="logo"
              width={120}
              height={40}
              className="invert opacity-80"
            />
          </SidebarGroupLabel>

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
                        onClick={() => {
                          if (isCreate) haptic.medium();
                          else haptic.selection();
                        }}
                        className={cn(
                          'rounded-xl font-medium',
                          'transition-all duration-220 ease-[cubic-bezier(0.32,0.72,0,1)]',
                          'active:scale-[0.96]',
                          active
                            ? cn(
                                'bg-white/[.14] backdrop-blur-xl',
                                'border border-white/18',
                                'shadow-[inset_0_1px_0_rgba(255,255,255,0.20),0_4px_12px_rgba(0,0,0,0.18)]'
                              )
                            : isCreate
                              ? cn(
                                  'bg-[rgba(0,122,255,0.75)] backdrop-blur-xl',
                                  'border border-[rgba(0,122,255,0.30)]',
                                  'shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_4px_16px_rgba(0,122,255,0.32)]',
                                  'text-white'
                                )
                              : 'hover:bg-white/[.07]'
                        )}
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
