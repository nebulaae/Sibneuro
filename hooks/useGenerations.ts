import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import axios from 'axios';
import api from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

// По документации inputs принимает массивы строк, а не объекты
export interface GenerateInputs {
  text?: string | null;
  image?: string[]; // массив URL или base64
  video?: string[];
  audio?: string[];
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

// Хелпер: конвертирует старый формат media[] → новый inputs по доке
export function convertMediaToInputs(
  text: string | null | undefined,
  media: Array<{ type: string; format: string; input: string }>
): GenerateInputs {
  const inputs: GenerateInputs = { text: text || null };

  const images = media.filter((m) => m.type === 'image').map((m) => m.input);
  const videos = media.filter((m) => m.type === 'video').map((m) => m.input);
  const audios = media.filter((m) => m.type === 'audio').map((m) => m.input);

  if (images.length) inputs.image = images;
  if (videos.length) inputs.video = videos;
  if (audios.length) inputs.audio = audios;

  return inputs;
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
