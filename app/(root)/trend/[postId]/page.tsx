'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { TrendDetail } from '@/components/pages/Trends';
import { usePost, type Post } from '@/hooks/usePosts';

const TrendDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const postId = params?.postId as string;
  const [cachedPost] = useState<Post | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem(`trend_post_${postId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const { data: apiPost, isLoading } = usePost(postId);
  const post = cachedPost ?? apiPost ?? null;

  if (!cachedPost && isLoading) {
    return (
      <div className="grid min-h-svh place-items-center bg-[#05070b]">
        <Loader2 className="size-9 animate-spin text-cyan-100" />
      </div>
    );
  }

  if (!post) {
    router.replace('/trends');
    return null;
  }

  return <TrendDetail post={post} onBack={() => router.back()} />;
};

export default TrendDetailPage;
