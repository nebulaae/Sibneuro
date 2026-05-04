'use client';

import { BottomBar } from '@/components/layout/BottomBar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { useEffect, useState } from 'react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setOpen(window.innerWidth >= 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <AuthGuard>
      <SidebarProvider open={open} onOpenChange={setOpen}>
        <AppSidebar />
        <main className="flex-1 relative overflow-x-hidden">{children}</main>
        <div className="md:hidden">
          <BottomBar />
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
