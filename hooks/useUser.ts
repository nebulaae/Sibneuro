import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export interface User {
  tokens: number;
  premium?: boolean;
  premium_end?: number;
}

export const useUser = () => {
  return useQuery({
    queryKey: queryKeys.user,
    queryFn: async (): Promise<{ user: User }> => {
      const { data } = await api.get('/api/user');
      return data;
    },
  });
};
