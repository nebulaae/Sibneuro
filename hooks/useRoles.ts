import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export interface RoleDescription {
  // url постера (или null) + локализованные тексты по ключам языков
  poster?: string | null;
  [lang: string]: string | null | undefined;
}

export interface Role {
  id: number;
  image?: string;
  label: Record<string, string> | string;
  description: RoleDescription | string;
}

export const useRoles = () => {
  return useQuery({
    queryKey: queryKeys.roles,
    queryFn: async (): Promise<Role[]> => {
      const { data } = await api.get('/api/roles');
      return data.roles;
    },
    staleTime: 5 * 60_000,
  });
};
