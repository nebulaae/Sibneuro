import api from '@/lib/api';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export interface Chat {
  dialogue_id: string;
  model: string;
  version: string;
  title?: string;
  avatar?: string;
  last_activity?: string;
  started_at?: string;
}

const getChats = async (limit: number, offset: number) => {
  const { data } = await api.get('/api/chats', { params: { limit, offset } });
  return data.chats as Chat[];
};

export const useChats = () => {
  return useInfiniteQuery({
    queryKey: queryKeys.chats,
    queryFn: ({ pageParam = 0 }) => getChats(20, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.flat().length;
      return lastPage.length >= 20 ? loaded : undefined;
    },
  });
};
