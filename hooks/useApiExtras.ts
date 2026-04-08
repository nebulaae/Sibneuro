import api from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

// POST /api/upload — загрузка файла
export const useUpload = () => {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (!data.success) throw new Error(data.error || 'Upload failed');
      return data as { success: true; url: string; type: string };
    },
  });
};

// GET /chats/history — история диалога
// Polling каждые 2 сек пока есть хоть одно processing сообщение
export const useChatHistory = (dialogueId: string | null) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.chatHistory(dialogueId!),
    queryFn: async () => {
      const { data } = await api.get('/api/chats/history', {
        params: { dialogue_id: dialogueId },
      });
      return (data.messages || []) as any[];
    },
    enabled: !!dialogueId,
    refetchInterval: (query) => {
      const msgs: any[] = query.state.data || [];
      const isProcessing = msgs.some((m) => m.status === 'processing');
      return isProcessing ? 2000 : false;
    },
    select: (msgs: any[]) => msgs,
  });
};

// GET /chats/history — polling последнего сообщения для Generate страницы
export const useGenerationStatus = (
  dialogueId: string | null,
  enabled: boolean
) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [...queryKeys.chatHistory(dialogueId!), 'status'],
    queryFn: async () => {
      const { data } = await api.get('/api/chats/history', {
        params: { dialogue_id: dialogueId },
      });
      const msgs: any[] = data.messages || [];
      return msgs[msgs.length - 1] || null;
    },
    enabled: !!dialogueId && enabled,
    refetchInterval: (query) => {
      const last = query.state.data;
      if (!last || last.status === 'processing') return 2000;
      queryClient.invalidateQueries({ queryKey: queryKeys.user });
      queryClient.invalidateQueries({ queryKey: queryKeys.requests });
      queryClient.invalidateQueries({
        queryKey: queryKeys.chatHistory(dialogueId!),
      });
      return false;
    },
  });
};

// GET /api/ui/:blockName
export const useUI = (blockName: string) => {
  return useQuery({
    queryKey: queryKeys.ui(blockName),
    queryFn: async () => {
      const { data } = await api.get(`/api/ui/${blockName}`);
      return data.content || [];
    },
    staleTime: 5 * 60_000,
  });
};

// GET /api/dashboard — лента постов
export const useDashboard = () => {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async () => {
      const { data } = await api.get('/api/dashboard');
      return data.posts || [];
    },
    staleTime: 60_000,
  });
};

// GET /api/referrals
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

// GET /api/payment-link
export const usePaymentLink = () => {
  return useQuery({
    queryKey: queryKeys.paymentLink,
    queryFn: async () => {
      const { data } = await api.get('/api/payment-link');
      if (!data.success) throw new Error(data.error);
      return data.url as string;
    },
    staleTime: 5 * 60_000,
  });
};

// POST /posts/like — лайк/дизлайк поста
export const useLikePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string | number) => {
      const { data } = await api.post('/api/posts/like', null, {
        params: { post_id: postId },
      });
      return data as { success: true; liked: boolean; likes: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
};

// GET /posts — публичная лента постов
export const usePosts = (params?: {
  userId?: number;
  limit?: number;
  offset?: number;
  minLikes?: number;
}) => {
  return useQuery({
    queryKey: queryKeys.posts(params),
    queryFn: async () => {
      const { data } = await api.get('/api/posts', {
        params: {
          ...(params?.userId ? { user_id: params.userId } : {}),
          limit: params?.limit ?? 20,
          offset: params?.offset ?? 0,
          ...(params?.minLikes != null ? { min_likes: params.minLikes } : {}),
        },
      });
      return data.items || [];
    },
    staleTime: 60_000,
  });
};

// POST /posts/publish — публикация поста
export const usePublishPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      model_tech_name: string;
      endpoint_id: number;
      version_label?: string;
      inputs?: Record<string, any>;
      params?: Record<string, any>;
      provider_task_id?: string;
      result?: Record<string, any>;
    }) => {
      const { data } = await api.post('/api/posts/publish', payload);
      if (!data.success) throw new Error(data.error);
      return data as { success: true; id: number; post_id: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
};

// POST /posts/comment — добавить комментарий
export const useAddComment = () => {
  return useMutation({
    mutationFn: async ({
      postId,
      message,
      replyId,
    }: {
      postId: number;
      message: { text: string };
      replyId?: number | null;
    }) => {
      const { data } = await api.post(
        '/api/posts/comment',
        {
          message,
          reply_id: replyId ?? null,
        },
        {
          params: { post_id: postId },
        }
      );
      if (!data.success) throw new Error(data.error);
      return data as { success: true; id: number };
    },
  });
};

// POST /posts/comment/pin — закрепить комментарий
export const usePinComment = () => {
  return useMutation({
    mutationFn: async ({
      postId,
      commentId,
    }: {
      postId: number;
      commentId: number;
    }) => {
      const { data } = await api.post('/api/posts/comment/pin', null, {
        params: { post_id: postId, comment_id: commentId },
      });
      if (!data.success) throw new Error(data.error);
      return data as { success: true };
    },
  });
};

// GET /posts/likes
export const usePostLikes = (postId: number | null) => {
  return useQuery({
    queryKey: queryKeys.postLikes(postId!),
    queryFn: async () => {
      const { data } = await api.get('/api/posts/likes', {
        params: { post_id: postId },
      });
      return data.items || [];
    },
    enabled: !!postId,
  });
};

// POST /chats/avatar — изменить аватар чата
export const useSetChatAvatar = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      dialogueId,
      avatar,
    }: {
      dialogueId: string;
      avatar: string;
    }) => {
      const { data } = await api.post('/api/chats/avatar', {
        dialogue_id: dialogueId,
        avatar,
      });
      if (!data.success) throw new Error(data.error);
      return data as { success: true; avatar: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chats });
    },
  });
};

// ============================================================
// GET /tokens — список API-токенов пользователя
// ФИКС Bug 5: если бэкенд вернул 404 (эндпоинт не существует),
// возвращаем пустой массив вместо краша страницы профиля
// ============================================================
export const useApiTokens = () => {
  return useQuery({
    queryKey: queryKeys.apiTokens,
    queryFn: async () => {
      try {
        const { data } = await api.get('/api/tokens');
        if (!data.success) return [];
        return data.items || [];
      } catch (err: any) {
        // 404 — эндпоинт не реализован на сервере, gracefully возвращаем []
        if (err?.response?.status === 404) return [];
        throw err;
      }
    },
    retry: false,
  });
};

// POST /tokens/generate — создать новый API-токен
export const useGenerateApiToken = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/api/tokens/generate');
      if (!data.success) throw new Error(data.error);
      return data as {
        success: true;
        id: number;
        bot_id: number;
        user_id: number;
        token: string;
        generations: number;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiTokens });
    },
  });
};

// GET /auth/session — получить/обновить сессию
export const useAuthSession = () => {
  return useMutation({
    mutationFn: async (params: {
      userId?: number;
      maxId?: number;
      sessionHash?: string;
      sessionData?: string;
    }) => {
      const { data } = await api.get('/api/auth/session', {
        params: {
          ...(params.userId ? { user_id: params.userId } : {}),
          ...(params.maxId ? { max_id: params.maxId } : {}),
          ...(params.sessionHash ? { session_hash: params.sessionHash } : {}),
          ...(params.sessionData ? { session_data: params.sessionData } : {}),
        },
      });
      if (!data.success) throw new Error(data.error);
      return data as {
        success: true;
        session_hash: string;
        session_data: { id: number; time: number };
      };
    },
  });
};

// POST /auth/password — смена пароля
export const useChangePassword = () => {
  return useMutation({
    mutationFn: async ({
      lastPassword,
      newPassword,
    }: {
      lastPassword: string;
      newPassword: string;
    }) => {
      const { data } = await api.post('/api/auth/password', {
        last_password: lastPassword,
        new_password: newPassword,
      });
      if (!data.success) throw new Error(data.error);
      return data as { success: true };
    },
  });
};

// DELETE /auth/method — отвязать метод авторизации
export const useRemoveAuthMethod = () => {
  return useMutation({
    mutationFn: async (method: 'telegram' | 'max' | 'email') => {
      const { data } = await api.delete('/api/auth/method', {
        data: { method },
      });
      if (!data.success) throw new Error(data.error);
      return data as { success: true; removed: string };
    },
  });
};

// GET /auth/method/link — ссылка для привязки Telegram/MAX
export const useAuthMethodLink = () => {
  return useMutation({
    mutationFn: async (method: 'telegram' | 'max') => {
      const { data } = await api.get('/api/auth/method/link', {
        params: { method },
      });
      if (!data.success) throw new Error(data.error);
      return data as { success: true; link: string; auth_code: string };
    },
  });
};

// POST /auth/method — привязать новый метод авторизации
export const useAddAuthMethod = () => {
  return useMutation({
    mutationFn: async (
      payload:
        | { auth_code: string; method: 'telegram' | 'max'; set_id: number }
        | { email: string; password: string }
    ) => {
      const { data } = await api.post('/api/auth/method', payload);
      if (!data.success) throw new Error(data.error);
      return data as { success: true; method: string };
    },
  });
};

// POST /auth/create/email — регистрация нового пользователя по email
export const useCreateEmailAccount = () => {
  return useMutation({
    mutationFn: async (payload: {
      email: string;
      password: string;
      name: string;
      lang?: string;
      avatar?: string;
    }) => {
      const botId = process.env.NEXT_PUBLIC_BOT_ID;
      const { data } = await api.post(
        `/api/auth/create/email?bot_id=${botId}`,
        {
          ...payload,
          lang: payload.lang ?? 'ru',
        }
      );
      if (!data.success) throw new Error(data.error);
      return data as {
        success: true;
        session_hash: string;
        session_data: { id: number; time: number };
      };
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
