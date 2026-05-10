import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  model_name?: string;
  cost?: number;
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
    [key: string]: any;
  };
  priority: number;
  likes: number;
  created_at: string;
  updated_at: string;
}

export function getPostResultImage(post: Post): string | null {
  if (post.result?.url) return post.result.url;
  if (post.result?.media && post.result.media.length > 0) {
    const first = post.result.media[0];
    return first.input;
  }
  return null;
}

export interface GetPostsParams {
  bot_id?: number;
  user_id?: number;
  limit?: number;
  offset?: number;
  min_likes?: number;
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
