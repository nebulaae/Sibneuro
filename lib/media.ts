import type { Post } from '@/hooks/usePosts';

// Видео распознаём по типу медиа или по расширению URL.
const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|ogv|m3u8)(\?|#|$)/i;

export const isVideoMedia = (
  url?: string | null,
  type?: string | null
): boolean => {
  if (type === 'video') return true;
  return typeof url === 'string' && VIDEO_EXT_RE.test(url);
};

/** Достаёт превью-URL поста и признак видео из result. */
export function resolvePostMedia(post: Pick<Post, 'result'> | null | undefined): {
  url: string | null;
  isVideo: boolean;
} {
  const result = (post?.result as any) || {};
  const media = result?.media?.[0] || result;
  const url = media?.url || media?.input || result?.url || null;
  return { url, isVideo: isVideoMedia(url, media?.type) };
}
