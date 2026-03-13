import api from '@/lib/api';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

// --- Загрузка файлов (с поддержкой iPhone .heic) ---
export const useUpload = () => {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await api.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (!data.success) throw new Error(data.error);
      return data;
    },
  });
};

// --- История чата с авто-поллингом ---
export const useChatHistory = (dialogueId: string | null) => {
  return useQuery({
    queryKey: queryKeys.chatHistory(dialogueId!),
    queryFn: async () => {
      const { data } = await api.get('/api/history', {
        params: { dialogue_id: dialogueId },
      });
      return data.messages || [];
    },
    enabled: !!dialogueId,
    refetchInterval: (query) => {
      const msgs = query.state.data || [];
      const isProcessing = msgs.some((m: any) => m.status === 'processing');
      return isProcessing ? 2000 : false;
    },
  });
};

// --- UI Блоки (Тренды) ---
export const useUI = (blockName: string) => {
  return useQuery({
    queryKey: queryKeys.ui(blockName),
    queryFn: async () => {
      const { data } = await api.get(`/api/ui/${blockName}`);
      return data.content || [];
    },
  });
};

// --- Реферальная система ---
export const useReferrals = (period = 'all', level = 'all') => {
  return useQuery({
    queryKey: queryKeys.referrals(period, level),
    queryFn: async () => {
      const { data } = await api.get('/api/referrals', {
        params: { period, level },
      });
      return data;
    },
  });
};
