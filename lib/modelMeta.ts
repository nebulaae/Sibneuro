import type { AIModel } from '@/hooks/useModels';

/**
 * Само-объясняемые метаданные модели.
 *
 * В API у модели нет описания/кейсов — формируем их эвристически из категории
 * и поддерживаемых типов ввода, чтобы пользователю не нужна была документация
 * (требование «модели и роли должны стать само-объясняемыми»).
 */

export type ModelKind = 'text' | 'image' | 'video' | 'audio';

type Lang = 'ru' | 'en';

const INPUT_LABELS: Record<string, Record<Lang, string>> = {
  text: { ru: 'Текст', en: 'Text' },
  image: { ru: 'Фото', en: 'Image' },
  video: { ru: 'Видео', en: 'Video' },
  audio: { ru: 'Аудио', en: 'Audio' },
};

const KIND_DESC: Record<ModelKind, Record<Lang, string>> = {
  text: {
    ru: 'Чат-модель: отвечает на вопросы, пишет тексты, помогает с идеями и кодом.',
    en: 'Chat model: answers questions, writes copy, helps with ideas and code.',
  },
  image: {
    ru: 'Генерация изображений по тексту или фото-референсу.',
    en: 'Generates images from a prompt or a reference photo.',
  },
  video: {
    ru: 'Создаёт короткие видео из текста или из фотографии.',
    en: 'Creates short videos from text or a photo.',
  },
  audio: {
    ru: 'Генерация музыки и звука по описанию.',
    en: 'Generates music and audio from a prompt.',
  },
};

const KIND_SCENARIOS: Record<ModelKind, Record<Lang, string[]>> = {
  text: {
    ru: ['Идеи и брейншторм', 'Тексты и переписка', 'Помощь с кодом'],
    en: ['Ideas & brainstorm', 'Copy & messages', 'Coding help'],
  },
  image: {
    ru: ['Аватары и арт', 'Дизайн и постеры', 'Редактирование фото'],
    en: ['Avatars & art', 'Design & posters', 'Photo editing'],
  },
  video: {
    ru: ['Reels и клипы', 'Оживление фото', 'Короткая реклама'],
    en: ['Reels & clips', 'Animate a photo', 'Short ads'],
  },
  audio: {
    ru: ['Музыка и биты', 'Джинглы', 'Озвучка'],
    en: ['Music & beats', 'Jingles', 'Voiceover'],
  },
};

export function getModelKind(m: AIModel): ModelKind {
  const c = m.mainCategory || '';
  if (c === 'text' || c === 'image' || c === 'video' || c === 'audio') {
    return c;
  }
  for (const k of ['video', 'audio', 'image', 'text'] as ModelKind[]) {
    if (m.categories?.includes(k)) return k;
  }
  return 'image';
}

export function getModelCost(m: AIModel): number {
  return (
    m.versions?.find((v) => v.default)?.cost ?? m.versions?.[0]?.cost ?? 1
  );
}

export interface ModelMeta {
  kind: ModelKind;
  description: string;
  inputs: string[];
  scenarios: string[];
  cost: number;
}

export function describeModel(m: AIModel, locale: string): ModelMeta {
  const lang: Lang = locale.startsWith('en') ? 'en' : 'ru';
  const kind = getModelKind(m);
  const inputs = (m.input || [])
    .filter((i) => INPUT_LABELS[i])
    .map((i) => INPUT_LABELS[i][lang]);
  return {
    kind,
    description: KIND_DESC[kind][lang],
    inputs,
    scenarios: KIND_SCENARIOS[kind][lang],
    cost: getModelCost(m),
  };
}
