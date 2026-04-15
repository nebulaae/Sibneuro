import api from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

// POST /api/upload
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

export const useChatHistory = (dialogueId: string | null) => {
  return useQuery({
    queryKey: queryKeys.chatHistory(dialogueId ?? 'none'),

    queryFn: async () => {
      if (!dialogueId) return [];

      const { data } = await api.get('/api/history', {
        params: { dialogue_id: dialogueId },
      });

      let messages = data?.messages;

      if (!messages && data?.data) {
        messages = data.data.messages || data.data;
      }

      if (!Array.isArray(messages) && Array.isArray(data)) {
        messages = data;
      }

      return Array.isArray(messages) ? messages : [];
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnReconnect: true,

    refetchInterval: (query) => {
      const msgs: any[] = query.state.data || [];
      const needsPolling = msgs.some(
        (m) => m.status === 'processing' || m.status === 'pending'
      );
      return needsPolling ? 2000 : false;
    },
  });
};

export const useGenerationStatus = (
  dialogueId: string | null,
  enabled: boolean
) => {
  return useQuery({
    queryKey: ['gen-status', dialogueId],
    queryFn: async () => {
      if (!dialogueId) return [];

      const { data } = await api.get('/api/history', {
        params: { dialogue_id: dialogueId },
      });
      const msgs = data.messages || data || [];
      return Array.isArray(msgs) ? msgs[msgs.length - 1] : null;
    },
    enabled: !!dialogueId && enabled,
    refetchInterval: 2000,
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

// GET /api/dashboard
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

// POST /api/posts/like
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

// GET /api/posts
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

// POST /api/posts/publish
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

// POST /api/posts/comment
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
        { message, reply_id: replyId ?? null },
        { params: { post_id: postId } }
      );
      if (!data.success) throw new Error(data.error);
      return data as { success: true; id: number };
    },
  });
};

// POST /api/posts/comment/pin
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

// GET /api/posts/likes
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

// POST /api/chats/avatar
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

// GET /api/tokens
export const useApiTokens = () => {
  return useQuery({
    queryKey: queryKeys.apiTokens,
    queryFn: async () => {
      try {
        const { data } = await api.get('/api/tokens');
        if (!data.success) return [];
        return data.items || [];
      } catch (err: any) {
        if (err?.response?.status === 404) return [];
        throw err;
      }
    },
    retry: false,
  });
};

// POST /api/tokens/generate
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

// GET /api/auth/session
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

// POST /api/auth/password
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

// DELETE /api/auth/method
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

// GET /api/auth/method/link
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

// POST /api/auth/method
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

// POST /api/auth/create/email
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
        { ...payload, lang: payload.lang ?? 'ru' }
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

// POST /api/chat/title — бекенд роут /chat/title (не /chats/title)
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
      const { data } = await api.post('/api/chat/title', {
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
