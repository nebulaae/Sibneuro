/* app/(root)/layout.tsx */
import { BottomBar } from '@/components/layout/BottomBar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AuthGuard } from '@/components/layout/AuthGuard';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider open={false}>
      <AppSidebar />

      {/* === Мягкий и минималистичный фон === */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">

        {/* Очень тонкие радиальные градиенты */}
        <div className="absolute inset-0 bg-[radial-gradient(at_25%_25%,rgba(103,232,249,0.035)_0%,transparent_45%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(at_75%_65%,rgba(52,211,153,0.035)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(at_40%_80%,rgba(167,139,250,0.025)_0%,transparent_40%)]" />

        {/* Сверхмягкие blurred орбы */}
        <div className="absolute -top-48 -left-48 w-[620px] h-[620px] rounded-full bg-cyan-400/2 blur-[160px]" />
        <div className="absolute top-1/3 right-[-80px] w-[520px] h-[520px] rounded-full bg-emerald-400/2 blur-[150px]" />
        <div className="absolute bottom-[-120px] left-1/2 -translate-x-1/2 w-[680px] h-[420px] rounded-full bg-violet-400/4 blur-[180px]" />
      </div>

      <main
        className="page-content flex flex-col items-center"
        style={{
          overflowX: 'hidden',
          minHeight: '100svh',
        }}
      >
        <div className="w-full max-w-2xl flex flex-col flex-1 pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))]">
          <AuthGuard>{children}</AuthGuard>
        </div>
      </main>

      <BottomBar />
    </SidebarProvider>
  );
}