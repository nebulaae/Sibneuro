import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
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
  created_at: string;
  updated_at: string;
}

export interface GetPostsParams {
  bot_id?: number;
  user_id?: number;
  limit?: number;
  page?: number;
  min_likes?: number;
  skipUserId?: boolean;
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

          // 💣 CRITICAL FIX
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

export function getPostResultMedia(
  post: Post
): { url: string; type: 'image' | 'video' | 'audio' } | null {
  const result = post.result as any;
  const media = result?.media?.[0] || result;
  const url = media?.url || media?.input || result?.url;

  if (!url || typeof url !== 'string') return null;

  const rawType = String(media?.type || '').toLowerCase();
  const type =
    rawType === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(url)
      ? 'video'
      : rawType === 'audio' || /\.(mp3|wav|ogg|m4a)(\?|$)/i.test(url)
        ? 'audio'
        : 'image';

  return { url, type };
}

export function getPostResultImage(post: Post): string | null {
  const media = getPostResultMedia(post);
  return media?.type === 'image' ? media.url : null;
}
