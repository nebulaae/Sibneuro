import type { AIModel } from '@/hooks/useModels';
import { getModelKind } from '@/lib/modelMeta';

/**
 * Раскладка медиа-слотов окна создания.
 *
 * Бекенд отдаёт в /api/params только лимиты (`limit_media`), напр. у версии
 * «Kling 3.0 Motion» это { image: 1, video: 1 }, а у «Kling 2.1» — { image: 2 }.
 * Один общий «прикрепить файл» на такие версии не годится: пользователь не
 * понимает, какой файл чем является. Поэтому раскладываем лимиты на именованные
 * слоты с подписью и подсказкой — по слоту на каждый ожидаемый файл.
 */

export type SlotAccept = 'image' | 'video' | 'audio';

export interface MediaSlot {
  /** Стабильный id вида `image-1` — им же ключуем загруженные файлы. */
  key: string;
  accept: SlotAccept;
  labelKey: string;
  hintKey?: string;
  /** Значения для интерполяции в labelKey (напр. номер слота). */
  labelValues?: Record<string, string | number>;
  required: boolean;
}

const ACCEPT_ATTR: Record<SlotAccept, string> = {
  image: 'image/*,.heic',
  video: 'video/*',
  audio: 'audio/*',
};

export const slotAcceptAttr = (accept: SlotAccept) => ACCEPT_ATTR[accept];

/** «Kling 3.0 Motion» и подобные: признак — слово motion в названии версии. */
export const isMotionVersion = (version?: string | null) =>
  !!version && /motion/i.test(version);

export function buildMediaSlots(
  model: AIModel | undefined,
  version: string | null | undefined,
  limitMedia: Record<string, number> | undefined
): MediaSlot[] {
  const limits = limitMedia || {};
  const image = limits.image || 0;
  const video = limits.video || 0;
  const audio = limits.audio || 0;

  // Один файл — раскладывать нечего, хватает обычного «прикрепить».
  if (image + video + audio < 2) return [];

  // Motion: своё фото (его оживляем) + референс, откуда берётся движение.
  if (isMotionVersion(version) && image === 1 && video === 1) {
    return [
      {
        key: 'image-1',
        accept: 'image',
        labelKey: 'slotMotionPhoto',
        hintKey: 'slotMotionPhotoHint',
        required: true,
      },
      {
        key: 'video-1',
        accept: 'video',
        labelKey: 'slotMotionRefVideo',
        hintKey: 'slotMotionRefVideoHint',
        required: true,
      },
    ];
  }

  // Два фото у видеомодели — это первый и последний кадр ролика.
  if (image === 2 && video === 0 && audio === 0 && model && getModelKind(model) === 'video') {
    return [
      {
        key: 'image-1',
        accept: 'image',
        labelKey: 'slotFirstFrame',
        hintKey: 'slotFirstFrameHint',
        required: false,
      },
      {
        key: 'image-2',
        accept: 'image',
        labelKey: 'slotLastFrame',
        hintKey: 'slotLastFrameHint',
        required: false,
      },
    ];
  }

  // Остальное — нумерованные слоты по типам файлов.
  const slots: MediaSlot[] = [];
  (['image', 'video', 'audio'] as SlotAccept[]).forEach((accept) => {
    const count = limits[accept] || 0;
    const single = count === 1;
    const base = accept === 'image' ? 'Image' : accept === 'video' ? 'Video' : 'Audio';
    for (let i = 1; i <= count; i++) {
      slots.push({
        key: `${accept}-${i}`,
        accept,
        labelKey: single ? `slot${base}` : `slot${base}N`,
        labelValues: single ? undefined : { n: i },
        required: false,
      });
    }
  });
  return slots;
}
