'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // Данные считаются свежими 1 мин — меньше повторных запросов при
      // навигации между вкладками мини-аппа, ощутимо быстрее отклик.
      staleTime: 60_000,
      // Держим кэш 5 мин после ухода со страницы — мгновенный возврат назад.
      gcTime: 5 * 60_000,
      refetchOnReconnect: true,
    },
  },
});

export const QueryProvider = ({ children }: any) => {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};
