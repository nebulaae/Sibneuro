import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import axios from 'axios';
import api from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export interface GenerateAIParams {
  tech_name: string;
  version?: string;
  inputs: { text?: string | null; media?: any[] };
  params?: Record<string, any>;
  dialogue_id?: string;
  role_id?: number;
}

const generateContent = async (params: GenerateAIParams) => {
  const { data } = await api.post('/api/generate', params);
  if (!data.success) throw new Error(data.error);
  return data;
};

export const useGenerateAI = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateContent,
    onSuccess: () => {
      toast.success('Генерация успешно запущена!');
      queryClient.invalidateQueries({ queryKey: queryKeys.requests });
      queryClient.invalidateQueries({ queryKey: queryKeys.chats });
      queryClient.invalidateQueries({ queryKey: queryKeys.user });
    },
    onError: (error: any) => {
      if (axios.isAxiosError(error)) {
        const errorMsg =
          error.response?.data?.error ||
          error.response?.data?.message ||
          'Ошибка генерации';

        if (
          errorMsg.toLowerCase().includes('insufficient tokens') ||
          errorMsg.toLowerCase().includes('недостаточно токенов')
        ) {
          toast.error('Недостаточно токенов', {
            description: 'Пополните баланс для продолжения.',
          });
        } else if (errorMsg.toLowerCase().includes('expired')) {
          toast.error('Подписка истекла', {
            description: 'Продлите Premium для использования этой модели.',
          });
        } else {
          toast.error('Ошибка', { description: errorMsg });
        }
        return;
      }
      toast.error('Неизвестная ошибка', { description: error.message });
    },
  });
};
