import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export interface Role {
  id: number;
  image?: string;
  label: Record<string, string> | string;
  description: Record<string, string> | string;
}

export const useRoles = () => {
  return useQuery({
    queryKey: queryKeys.roles,
    queryFn: async (): Promise<Role[]> => {
      const { data } = await api.get('/api/roles');
      return data.roles;
    },
  });
};
