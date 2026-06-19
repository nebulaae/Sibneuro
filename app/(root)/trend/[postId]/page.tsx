import type { Metadata } from 'next';
import TrendDetailClient from './TrendDetailClient';
import { resolvePostMedia } from '@/lib/media';
import {
  SITE_NAME,
  SITE_URL,
  SITE_DESCRIPTION_RU,
  trendJsonLd,
} from '@/lib/seo';

// Серверный fetch поста для SEO. Любая ошибка → null (страница не падает,
// просто наследует базовые метаданные).
async function fetchPost(postId: string): Promise<any | null> {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL;
    const botId = process.env.NEXT_PUBLIC_BOT_ID;
    if (!base) return null;
    const res = await fetch(
      `${base}/api/posts/one?post_id=${encodeURIComponent(postId)}${
        botId ? `&bot_id=${botId}` : ''
      }`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.post ?? data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ postId: string }>;
}): Promise<Metadata> {
  const { postId } = await params;
  const post = await fetchPost(postId);

  const name = post?.name || post?.inputs?.text || `${SITE_NAME} — AI генерация`;
  const { url: mediaUrl } = post
    ? resolvePostMedia(post)
    : { url: null as string | null };
  const description = post?.model_name
    ? `Сгенерировано в ${post.model_name}. ${SITE_DESCRIPTION_RU}`
    : SITE_DESCRIPTION_RU;
  const canonical = `/trend/${postId}`;

  return {
    title: name,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      title: name,
      description,
      url: `${SITE_URL}${canonical}`,
      images: mediaUrl ? [{ url: mediaUrl }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: name,
      description,
      images: mediaUrl ? [mediaUrl] : undefined,
    },
  };
}

export default async function TrendDetailPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const post = await fetchPost(postId);

  const jsonLd = post
    ? (() => {
        const { url, isVideo } = resolvePostMedia(post);
        return trendJsonLd({
          id: postId,
          name: post.name || post.inputs?.text || `${SITE_NAME} генерация`,
          mediaUrl: url,
          isVideo,
          createdAt: post.created_at,
        });
      })()
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <TrendDetailClient />
    </>
  );
}
