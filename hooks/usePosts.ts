import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import api from '@/lib/api';

export interface PostInputMedia {
  type: string;
  input: string | null;
  format: string;
  reference?: {
    hide?: boolean;
    replace?: boolean;
  };
}

export interface Post {
  id: number;
  bot_id: number;
  user_id: number;
  model_tech_name: string;
  version_label: string;
  inputs: {
    text: string | null;
    hide_text: boolean;
    media: {
      type: string;
      input: PostInputMedia;
    }[];
  };
  params: Record<string, any>;
  result: {
    url?: string;
    text?: string | null;
    media?: Array<{
      type: string;
      input: string;
      format: string;
    }>;
  };
  model_name?: string;
  cost?: number;
  priority: number;
  likes: number;
  liked?: boolean;
  created_at: string;
  updated_at: string;
}

export interface GetPostsParams {
  bot_id?: number;
  user_id?: number;
  limit?: number;
  page?: number;
  min_likes?: number;
}
export interface PostsResponse {
  success: boolean;
  items: Post[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
}

export const usePosts = (params: GetPostsParams = {}) => {
  return useQuery({
    queryKey: ['posts', params],
    queryFn: async () => {
      const { data } = await api.get('/api/posts', { params });
      return data;
    },
  });
};

export const usePost = (id: number | string | null | undefined) => {
  return useQuery({
    queryKey: ['posts', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/posts/${id}`, {
        params: { skipUserId: true },
      });
      return data as Post;
    },
    enabled: !!id,
  });
};

export const useInfinitePosts = (params: any = {}) => {
  return useInfiniteQuery({
    queryKey: ['posts', 'infinite'],

    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await api.get('/api/posts', {
        params: {
          ...params,
          page: pageParam,
          limit: params.limit || 12,
          skipUserId: true,
        },
      });

      return data;
    },

    initialPageParam: 1,

    getNextPageParam: (lastPage) => {
      if (!lastPage?.hasNextPage) return undefined;
      return lastPage.page + 1;
    },
  });
};

export const usePublishPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Post>) => {
      const { data } = await api.post('/api/posts/publish', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};

// ─── Like / Unlike ───────────────────────────────────────────────────────────

interface LikeParams {
  post_id: number;
  bot_id: number;
  user_id: number;
}

interface LikeResponse {
  success: boolean;
  liked: boolean;
  likes: number;
}

export const useLikePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ post_id, bot_id, user_id }: LikeParams) => {
      const { data } = await api.post<LikeResponse>('/api/posts/like', null, {
        params: { bot_id, post_id, user_id },
      });
      return data;
    },

    // Optimistic update — мгновенно обновляем лайк в кэше
    onMutate: async ({ post_id }) => {
      await queryClient.cancelQueries({ queryKey: ['posts', 'infinite'] });

      const previousData = queryClient.getQueryData(['posts', 'infinite']);

      queryClient.setQueryData(['posts', 'infinite'], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.map((post: Post) => {
              if (post.id !== post_id) return post;
              const newLiked = !post.liked;
              return {
                ...post,
                liked: newLiked,
                likes: newLiked ? post.likes + 1 : Math.max(0, post.likes - 1),
              };
            }),
          })),
        };
      });

      return { previousData };
    },

    // При ошибке — откатываем
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['posts', 'infinite'], context.previousData);
      }
    },

    // После успешного ответа — синхронизируем реальные данные с сервера
    onSuccess: (data, { post_id }) => {
      queryClient.setQueryData(['posts', 'infinite'], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.map((post: Post) => {
              if (post.id !== post_id) return post;
              return { ...post, liked: data.liked, likes: data.likes };
            }),
          })),
        };
      });

      // Обновляем и одиночный пост если он в кэше
      queryClient.setQueryData(['posts', post_id], (old: Post | undefined) => {
        if (!old) return old;
        return { ...old, liked: data.liked, likes: data.likes };
      });
    },
  });
};
