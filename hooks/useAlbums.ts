import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PublicAlbumResponse {
  success: boolean;
  album: Album;
  items: AlbumPost[];
}

export interface Album {
  id: number;
  name: string;
  picture: string | null;
  is_public: boolean;
  public_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlbumPost {
  id: number;
  model_tech_name: string;
  version_label: string;
  model_name: string;
  name: string;
  cost: number;
  inputs: {
    text?: string | null;
    media?: unknown[] | null;
  };
  params: Record<string, unknown>;
  result: {
    url?: string;
    text?: string | null;
    media?: Array<{ type: string; input: string; format: string }>;
  };
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface AlbumWithPosts {
  album: Album;
  items: AlbumPost[];
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const albumQueryKeys = {
  all: ['albums'] as const,
  list: () => [...albumQueryKeys.all, 'list'] as const,
  posts: (albumId: number) =>
    [...albumQueryKeys.all, 'posts', albumId] as const,
  public: (publicId: string) =>
    [...albumQueryKeys.all, 'public', publicId] as const,
};

// ─── GET /albums ──────────────────────────────────────────────────────────────

export const useAlbums = () => {
  return useQuery({
    queryKey: albumQueryKeys.list(),
    queryFn: async () => {
      const { data } = await api.get('/api/albums');
      if (!data.success)
        throw new Error(data.error ?? 'Failed to fetch albums');
      return data.items as Album[];
    },
    staleTime: 1000 * 60 * 2, // 2 min
  });
};

// ─── GET /albums/posts ────────────────────────────────────────────────────────

export const useAlbumPosts = (albumId: number | null) => {
  return useQuery({
    queryKey: albumQueryKeys.posts(albumId!),
    queryFn: async () => {
      const { data } = await api.get('/api/albums/posts', {
        params: { album_id: albumId },
      });
      if (!data.success)
        throw new Error(data.error ?? 'Failed to fetch album posts');
      return data as AlbumWithPosts;
    },
    enabled: albumId !== null,
    staleTime: 1000 * 60,
  });
};

// ─── POST /albums/create ──────────────────────────────────────────────────────

export const useCreateAlbum = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; picture?: string }) => {
      const { data } = await api.post('/api/albums/create', payload);
      if (!data.success)
        throw new Error(data.error ?? 'Failed to create album');
      return data as { success: true; id: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: albumQueryKeys.list() });
    },
  });
};

// ─── POST /albums/delete ──────────────────────────────────────────────────────

export const useDeleteAlbum = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (albumId: number) => {
      const { data } = await api.post('/api/albums/delete', null, {
        params: { album_id: albumId },
      });
      if (!data.success)
        throw new Error(data.error ?? 'Failed to delete album');
      return data as { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: albumQueryKeys.list() });
    },
  });
};

// ─── POST /albums/update ──────────────────────────────────────────────────────

export const useUpdateAlbum = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      albumId,
      payload,
    }: {
      albumId: number;
      payload: { name?: string; picture?: string | null };
    }) => {
      const { data } = await api.post('/api/albums/update', payload, {
        params: { album_id: albumId },
      });
      if (!data.success)
        throw new Error(data.error ?? 'Failed to update album');
      return data as { success: true };
    },
    onSuccess: (_data, { albumId }) => {
      queryClient.invalidateQueries({ queryKey: albumQueryKeys.list() });
      queryClient.invalidateQueries({
        queryKey: albumQueryKeys.posts(albumId),
      });
    },
  });
};

// ─── POST /albums/visibility ──────────────────────────────────────────────────

export const useToggleAlbumVisibility = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      albumId,
      isPublic,
    }: {
      albumId: number;
      isPublic: boolean;
    }) => {
      const { data } = await api.post(
        '/api/albums/visibility',
        { is_public: isPublic },
        { params: { album_id: albumId } }
      );
      if (!data.success)
        throw new Error(data.error ?? 'Failed to toggle visibility');
      return data as {
        success: true;
        is_public: boolean;
        public_id: string | null;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: albumQueryKeys.list() });
    },
  });
};

// ─── POST /albums/add ─────────────────────────────────────────────────────────

export const useAddPostToAlbum = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      albumId,
      postId,
    }: {
      albumId: number;
      postId: number;
    }) => {
      const { data } = await api.post('/api/albums/add', null, {
        params: { album_id: albumId, post_id: postId },
      });
      if (!data.success)
        throw new Error(data.error ?? 'Failed to add post to album');
      return data as { success: true; id: number };
    },
    onSuccess: (_data, { albumId }) => {
      queryClient.invalidateQueries({
        queryKey: albumQueryKeys.posts(albumId),
      });
    },
  });
};

// ─── POST /albums/remove ──────────────────────────────────────────────────────

export const useRemovePostFromAlbum = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      albumId,
      postId,
    }: {
      albumId: number;
      postId: number;
    }) => {
      const { data } = await api.post('/api/albums/remove', null, {
        params: { album_id: albumId, post_id: postId },
      });
      if (!data.success)
        throw new Error(data.error ?? 'Failed to remove post from album');
      return data as { success: true };
    },
    onSuccess: (_data, { albumId }) => {
      queryClient.invalidateQueries({
        queryKey: albumQueryKeys.posts(albumId),
      });
    },
  });
};

// ─── GET /albums/public/:public_id ────────────────────────────────────────────
// Не требует авторизации (без bot_id / user_id)

export const usePublicAlbum = (publicId: string | null) => {
  return useQuery({
    queryKey: albumQueryKeys.public(publicId!),
    queryFn: async () => {
      // Используем axios instance напрямую — без bot_id/user_id в params
      const { data } = await api.get(`/api/albums/public/${publicId}`);
      if (!data.success) {
        const err = new Error(data.error ?? 'not_found');
        (err as any).status = 404;
        throw err;
      }
      return data as PublicAlbumResponse;
    },
    enabled: !!publicId,
    staleTime: 1000 * 60 * 5, // 5 min — публичная страница меняется редко
    retry: (failureCount, error: any) => {
      // Не ретраить 404
      if (error?.status === 404 || error?.message === 'not_found') return false;
      return failureCount < 2;
    },
  });
};
