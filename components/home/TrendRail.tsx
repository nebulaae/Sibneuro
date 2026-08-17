'use client';

import { useRouter } from 'next/navigation';
import { Play, Camera, ChevronRight } from 'lucide-react';
import type { Post } from '@/hooks/usePosts';
import {
  isVideoPost,
  needsUserPhoto,
  postMediaUrl,
  postTitle,
} from '@/lib/postGroups';
import { SmartImage } from '@/components/shared/SmartImage';
import { SmartVideo } from '@/components/shared/SmartVideo';
import { useHaptic } from '@/hooks/useHaptic';
import { useDragScroll } from '@/hooks/useDragScroll';

/**
 * Горизонтальная полка трендов — одна тема, один ряд.
 *
 * Карточки намеренно узкие: из-за края экрана всегда видно «половину»
 * следующей, и ряд читается как прокручиваемый без отдельной подсказки.
 */
export function TrendRail({
  groupId,
  title,
  posts,
  allLabel,
  fallbackTitle,
}: {
  groupId: string;
  title: string;
  posts: Post[];
  allLabel: string;
  fallbackTitle: string;
}) {
  const router = useRouter();
  const haptic = useHaptic();
  // На ПК тача нет: без этого полку можно листать только полосой прокрутки.
  // Хук добавляет колесо и перетаскивание мышью и гасит клик после драга,
  // чтобы протяжка не открывала карточку под курсором.
  const trackRef = useDragScroll<HTMLDivElement>();

  if (!posts.length) return null;

  // В тематической полке («Селфи», «Портрет») название совпадает с заголовком
  // ряда и на каждой карточке повторяется одно и то же слово. В таком случае
  // подписываем карточку нейросетью — это единственное, чем они различаются.
  const uniform =
    posts.length > 1 &&
    posts.every(
      (p) => postTitle(p, fallbackTitle) === postTitle(posts[0], fallbackTitle)
    );

  return (
    <section className="min-w-0 flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h3 className="truncate text-[24px] font-black tracking-tight text-cyan-400">
          {title}
        </h3>
        <button
          onClick={() => {
            haptic.selection();
            router.push(`/trends?group=${encodeURIComponent(groupId)}`);
          }}
          className="flex shrink-0 items-center gap-0.5 text-[13px] font-bold text-white/35 transition-colors hover:text-cyan-200"
        >
          {allLabel}
          <ChevronRight size={14} />
        </button>
      </div>

      {/* -mx-5/px-5: полка идёт от края до края, а отступы держат первую и
          последнюю карточку на одной линии с остальным контентом. */}
      <div
        ref={trackRef}
        className="-mx-5 flex cursor-grab snap-x snap-mandatory gap-3 overflow-x-auto px-5 scroll-pl-5 active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {posts.map((post) => {
          const url = postMediaUrl(post);
          const video = isVideoPost(post);
          return (
            <button
              key={post.id}
              onClick={() => {
                haptic.light();
                router.push(`/trend/${post.id}`);
              }}
              // Две карточки в видимой области на телефоне и три на широком
              // экране: на 375px треть ширины — это уже нечитаемая марка.
              // Вычитаемое — суммарная ширина зазоров gap-3 (0.75rem каждый).
              className="group relative aspect-3/4 w-[calc((100%-0.75rem)*0.5)] sm:w-[calc((100%-1.5rem)*0.3333)] shrink-0 snap-start overflow-hidden rounded-[22px] border border-white/[0.10] bg-white/[0.05] text-left transition-all active:scale-[0.97] hover:border-cyan-400/30"
            >
              {url ? (
                video ? (
                  // Видео в полке проигрывается само: неподвижный первый кадр
                  // не отличить от фото, и весь смысл раздела «Видео»
                  // пропадает. SmartVideo сам щадит трафик и декодер.
                  <SmartVideo
                    src={url}
                    active
                    className="absolute inset-0 h-full w-full"
                    ctx={{ surface: 'home-rail', group: groupId }}
                  />
                ) : (
                  <SmartImage
                    src={url}
                    alt=""
                    className="absolute inset-0 h-full w-full"
                    ctx={{ surface: 'home-rail', group: groupId }}
                  />
                )
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-white/5 text-[28px]">
                  ✨
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

              <div className="absolute left-2 top-2 flex gap-1">
                {video && (
                  <span className="flex size-6 items-center justify-center rounded-full border border-white/15 bg-black/55 backdrop-blur-md">
                    <Play size={11} className="fill-white text-white" />
                  </span>
                )}
                {needsUserPhoto(post) && (
                  <span className="flex size-6 items-center justify-center rounded-full border border-white/15 bg-black/55 backdrop-blur-md">
                    <Camera size={11} className="text-white" />
                  </span>
                )}
              </div>

              <p className="absolute inset-x-0 bottom-0 line-clamp-2 p-2.5 text-[12px] font-black leading-tight text-white transition-colors group-hover:text-cyan-200">
                {uniform
                  ? post.model_name || ''
                  : postTitle(post, fallbackTitle)}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
