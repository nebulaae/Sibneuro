import api from '@/lib/api';
import { useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export type MediaItem = {
  type: 'image' | 'audio' | 'video';
  input: string;
  format: string;
};
export type RequestStatus = 'completed' | 'processing' | 'error';
export interface GenerationRequest {
  id: number;
  dialogue_id: number | string;
  version: string;
  model: string;
  cost: number;
  status: RequestStatus;
  created_at: string;
  inputs: {
    text?: string | null;
    media?: any[];
  };
  result?: {
    text?: string | null;
    media?: MediaItem[];
  } | null;
}

// GET /reqs — история генераций
// ФИКС: bot_id и user_id добавляются через interceptor в api.ts автоматически
// Убедись что пользователь авторизован перед вызовом
const getRequests = async (limit: number, offset: number) => {
  const { data } = await api.get('/api/requests', {
    params: { limit, offset },
  });
  if (!data.success && data.error) throw new Error(data.error);
  return (data.requests || []) as GenerationRequest[];
};

export const useRequests = () => {
  return useInfiniteQuery({
    queryKey: queryKeys.requests,
    queryFn: ({ pageParam = 0 }) => getRequests(20, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.flat().length;
      return lastPage.length >= 20 ? loaded : undefined;
    },
    retry: 1,
  });
};
