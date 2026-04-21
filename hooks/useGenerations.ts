import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import axios from 'axios';
import api from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export interface GenerateInputs {
  text?: string | null;
  media?: Array<{ type: string; format: string; input: string }>;
}

export interface GenerateAIParams {
  tech_name: string;
  version?: string;
  inputs: GenerateInputs;
  params?: Record<string, any>;
  dialogue_id?: string;
  role_id?: number | null;
  callback_webhook?: string;
}

export function normalizeResultMedia(
  media: any[]
): Array<{ url: string; type: string }> {
  if (!Array.isArray(media)) return [];
  return media
    .map((m) => {
      let url = '';
      let type = 'image';

      // Обработка вложенной структуры: input может быть объектом {type, format, input}
      if (typeof m.input === 'object' && m.input !== null) {
        url = m.input.input || '';
        type = m.input.type || 'image';
      } else {
        // m.url или m.input - обычная строка URL
        url = m.url || m.input || '';
        type = m.type || 'image';
      }

      return { url, type };
    })
    .filter((m) => m.url);
}

export function convertMediaToInputs(
  text: string | null,
  media: { type: string; input: string; format?: string }[]
) {
  const inputs: any = {};

  if (text) inputs.text = text;

  // Если есть медиа, отправляем её в формате media: [{type, format, input}]
  if (media.length > 0) {
    inputs.media = media.map((m) => ({
      type: m.type,
      format: m.format || 'url',
      input: m.input,
    }));
  }

  return inputs;
}

const generateContent = async (params: GenerateAIParams) => {
  const { data } = await api.post('/api/generate', params);
  if (!data.success) {
    const err = new Error(data.error || 'Ошибка генерации') as any;
    err.apiError = data.error;
    throw err;
  }
  return data;
};

export const useGenerateAI = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateContent,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.requests });
      queryClient.invalidateQueries({ queryKey: queryKeys.chats });
      queryClient.invalidateQueries({ queryKey: queryKeys.user });

      if (data.dialogue_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.chatHistory(data.dialogue_id),
        });
      }
    },
    onError: (error: any) => {
      const apiError: string | undefined = error?.apiError;
      const msg =
        apiError ||
        (axios.isAxiosError(error)
          ? error.response?.data?.error ||
            error.response?.data?.message ||
            'Ошибка генерации'
          : error.message || 'Неизвестная ошибка');

      if (
        msg.toLowerCase().includes('insufficient tokens') ||
        msg.toLowerCase().includes('недостаточно токенов')
      ) {
        toast.error('Недостаточно токенов', {
          description: 'Пополните баланс для продолжения.',
        });
      } else if (
        msg.toLowerCase().includes('expired') ||
        msg.toLowerCase().includes('premium')
      ) {
        toast.error('Подписка истекла', {
          description: 'Продлите Premium для использования этой модели.',
        });
      } else {
        toast.error('Ошибка', { description: msg });
      }
    },
  });
};
