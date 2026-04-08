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
  useSidebar,
} from '@/components/ui/sidebar';
import { Brain, Home, MessageCircle, Sparkle, UserRound } from 'lucide-react';
import Image from 'next/image';

const items = [
  { id: 1, href: '/', label: 'Главная', icon: Home },
  { id: 2, href: '/models', label: 'Модели', icon: Brain },
  { id: 3, href: '/generate', label: 'Создать', icon: Sparkle },
  { id: 4, href: '/chats', label: 'Чаты', icon: MessageCircle },
  { id: 5, href: '/profile', label: 'Профиль', icon: UserRound },
];

/* Inline style constants */
const glassStyles = {
  sidebarInner: {
    background: 'var(--glass-thick)',
    backdropFilter: 'var(--blur-thick) var(--vibrancy)',
    WebkitBackdropFilter: 'var(--blur-thick) var(--vibrancy)',
    borderRadius: 'var(--radius-xl)',
    border: 'var(--glass-border-regular)',
    boxShadow: 'var(--glass-specular), var(--glass-shadow-xl)',
  } as React.CSSProperties,
};

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) router.replace('/login');
  }, [router]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarContent
        className="rounded-xl py-1"
        style={{
          background: 'var(--glass-thick)',
          backdropFilter: 'blur(50px) saturate(180%) contrast(110%)',
          WebkitBackdropFilter: 'blur(50px) saturate(180%) contrast(110%)',
          borderRadius: 'var(--radius-xl)',
          border: 'var(--glass-border-regular)',
          boxShadow: 'var(--glass-specular), var(--glass-shadow-xl)',
        }}
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
                        style={{
                          borderRadius: 'var(--radius-md)',
                          fontWeight: 500,
                          transition:
                            'all 0.22s cubic-bezier(0.32, 0.72, 0, 1)',
                          ...(active
                            ? {
                                background: 'var(--glass-thick)',
                                backdropFilter: 'blur(40px)',
                                WebkitBackdropFilter: 'blur(40px)',
                                border: 'var(--glass-border-regular)',
                                boxShadow:
                                  'var(--glass-specular), var(--glass-shadow-md)',
                              }
                            : isCreate
                              ? {
                                  background: 'rgba(0, 122, 255, 0.75)',
                                  backdropFilter: 'blur(30px)',
                                  WebkitBackdropFilter: 'blur(30px)',
                                  border: '1px solid rgba(0, 122, 255, 0.3)',
                                  boxShadow:
                                    'inset 0 1px 0 rgba(255,255,255,0.35), 0 4px 16px rgba(0,122,255,0.3)',
                                  color: '#fff',
                                }
                              : {}),
                        }}
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
