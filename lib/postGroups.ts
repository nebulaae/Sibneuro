import type { Post } from '@/hooks/usePosts';

/**
 * Разбор ленты трендов на тематические полки.
 *
 * Зачем: главная показывала один сплошной грид «Тренды» — 1500+ постов подряд,
 * в котором видео, фото-шаблоны и разные нейросети свалены вместе. Понять, что
 * вообще есть в сервисе, по такому гриду невозможно, и пользователь уходит.
 * Полки («Видео», «Nano Banana», «Селфи»…) отвечают на вопрос «что тут есть»
 * за один экран, а общая лента остаётся ниже — для тех, кто хочет листать всё.
 *
 * Группы вычисляются из данных, а не из захардкоженного списка: бекенд не
 * отдаёт категорий, но у поста есть модель, название-тема и состав медиа.
 */

export type PostGroup = {
  /** Стабильный id для ссылки «Все» → /trends?group=<id> */
  id: string;
  title: string;
  posts: Post[];
};

export type GroupLabels = {
  popular: string;
  video: string;
  photo: string;
};

/** Минимум постов, иначе полка выглядит пустой и только шумит. */
const MIN_GROUP_SIZE = 4;
/** Сколько постов показываем в одной полке (остальное — по кнопке «Все»). */
const RAIL_SIZE = 12;
/** Ограничение на число динамических полок, чтобы главная не стала бесконечной. */
const MAX_MODEL_RAILS = 4;
const MAX_THEME_RAILS = 5;

type PostWithMeta = Post & { name?: string; tag?: string | null };

export function postTitle(post: Post, fallback: string): string {
  const meta = post as PostWithMeta;
  return meta.name || post.inputs?.text || fallback;
}

export function postMediaUrl(post: Post): string | undefined {
  const media = post.result?.media?.[0];
  return media?.input || post.result?.url || undefined;
}

export function isVideoPost(post: Post): boolean {
  const media = post.result?.media?.[0];
  if (media?.type === 'video') return true;
  const url = postMediaUrl(post);
  return typeof url === 'string' && /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

/** Пост-шаблон: нужно подставить своё фото. Самый короткий путь к результату. */
export function needsUserPhoto(post: Post): boolean {
  return (post.inputs?.media?.length ?? 0) > 0;
}

function modelKey(post: Post): string | null {
  const name = post.model_name?.trim();
  return name ? name : null;
}

function themeKey(post: Post): string | null {
  const name = (post as PostWithMeta).name?.trim();
  // Отсекаем «названия», которые на деле являются промптом целиком.
  if (!name || name.length > 32) return null;
  return name;
}

/**
 * Принадлежит ли пост группе с таким id. Используется на странице «Все»,
 * где полка разворачивается в полноценный список.
 */
export function matchesGroup(post: Post, groupId: string): boolean {
  if (groupId === 'video') return isVideoPost(post);
  if (groupId === 'photo') return needsUserPhoto(post);
  if (groupId === 'popular') return (post.likes ?? 0) > 0;

  const [kind, ...rest] = groupId.split(':');
  const value = rest.join(':');
  if (kind === 'model') return modelKey(post) === value;
  if (kind === 'theme') return themeKey(post) === value;
  return false;
}

/** Заголовок группы для страницы «Все» — по id, без исходного списка постов. */
export function groupTitle(groupId: string, labels: GroupLabels): string {
  if (groupId === 'video') return labels.video;
  if (groupId === 'photo') return labels.photo;
  if (groupId === 'popular') return labels.popular;

  const [kind, ...rest] = groupId.split(':');
  const value = rest.join(':');
  if (kind === 'model' || kind === 'theme') return value;
  return '';
}

function byCountDesc<T>(map: Map<string, T[]>): Array<[string, T[]]> {
  return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
}

export function buildPostGroups(
  posts: Post[],
  labels: GroupLabels
): PostGroup[] {
  if (!posts.length) return [];

  const groups: PostGroup[] = [];
  const push = (id: string, title: string, items: Post[]) => {
    if (items.length < MIN_GROUP_SIZE) return;
    groups.push({ id, title, posts: items.slice(0, RAIL_SIZE) });
  };

  // 1. Популярное — сортировка по лайкам, а не по дате.
  push(
    'popular',
    labels.popular,
    posts.filter((p) => (p.likes ?? 0) > 0).sort((a, b) => b.likes - a.likes)
  );

  // 2. Видео — самый заметный по вау-эффекту формат, его прячет общий грид.
  push('video', labels.video, posts.filter(isVideoPost));

  // 3. Шаблоны под своё фото — вход с наименьшим порогом.
  push('photo', labels.photo, posts.filter(needsUserPhoto));

  // 4. По нейросетям: Nano Banana, Seedream, Kling…
  const byModel = new Map<string, Post[]>();
  for (const post of posts) {
    const key = modelKey(post);
    if (!key) continue;
    byModel.set(key, [...(byModel.get(key) ?? []), post]);
  }
  for (const [name, items] of byCountDesc(byModel).slice(0, MAX_MODEL_RAILS)) {
    push(`model:${name}`, name, items);
  }

  // 5. По темам: Селфи, Портрет, Уличное…
  const byTheme = new Map<string, Post[]>();
  for (const post of posts) {
    const key = themeKey(post);
    if (!key) continue;
    byTheme.set(key, [...(byTheme.get(key) ?? []), post]);
  }
  for (const [name, items] of byCountDesc(byTheme).slice(0, MAX_THEME_RAILS)) {
    push(`theme:${name}`, name, items);
  }

  return groups;
}
