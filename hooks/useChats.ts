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
  role_id?: number | null;
  last_activity?: string;
  started_at?: string;
}

// GET /chats — список диалогов
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

// POST /chats/title — изменить заголовок диалога
export const useSetChatTitle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      dialogueId,
      title,
    }: {
      dialogueId: string;
      title: string;
    }) => {
      const { data } = await api.post('/api/chats/title', {
        dialogue_id: dialogueId,
        title,
      });
      if (!data.success) throw new Error(data.error);
      return data as { success: true; title: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chats });
    },
  });
};
