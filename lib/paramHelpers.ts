const PARAM_LABELS_RU: Record<string, string> = {
  aspect_ratio: 'Соотношение сторон',
  seed: 'Сид (случайность)',
  output_format: 'Формат вывода',
  safety_tolerance: 'Уровень безопасности',
  resolution: 'Разрешение',
  image_size: 'Размер изображения',
  background: 'Фон',
  quality: 'Качество',
  input_fidelity: 'Точность входного изображения',
  duration: 'Длительность (сек.)',
  title: 'Название трека',
  style: 'Стиль музыки',
  negative_tags: 'Исключить теги',
  vocal_gender: 'Голос',
  instrumental: 'Инструментал',
  custom_mode: 'Кастомный режим',
  enable_web_search: 'Веб-поиск',
};

const PARAM_LABELS_EN: Record<string, string> = {
  aspect_ratio: 'Aspect ratio',
  seed: 'Seed',
  output_format: 'Output format',
  safety_tolerance: 'Safety tolerance',
  resolution: 'Resolution',
  image_size: 'Image size',
  background: 'Background',
  quality: 'Quality',
  input_fidelity: 'Input fidelity',
  duration: 'Duration (sec.)',
  title: 'Track title',
  style: 'Music style',
  negative_tags: 'Exclude tags',
  vocal_gender: 'Voice gender',
  instrumental: 'Instrumental',
  custom_mode: 'Custom mode',
  enable_web_search: 'Web search',
};

// Значения которые требуют перевода — остальные (числа, размеры, форматы) оставляем как есть
const PARAM_VALUES_RU: Record<string, Record<string, string>> = {
  vocal_gender: { m: 'Мужской', f: 'Женский' },
  instrumental: { true: 'Да', false: 'Нет' },
  custom_mode: { true: 'Вкл', false: 'Выкл' },
  enable_web_search: { true: 'Вкл', false: 'Выкл' },
  background: {
    auto: 'Авто',
    transparent: 'Прозрачный',
    opaque: 'Непрозрачный',
  },
  quality: { low: 'Низкое', medium: 'Среднее', high: 'Высокое' },
  input_fidelity: { low: 'Низкая', high: 'Высокая' },
  image_size: { auto: 'Авто' },
  output_format: { jpeg: 'JPEG', png: 'PNG', webp: 'WebP' },
};

const PARAM_VALUES_EN: Record<string, Record<string, string>> = {
  vocal_gender: { m: 'Male', f: 'Female' },
  instrumental: { true: 'Yes', false: 'No' },
  custom_mode: { true: 'On', false: 'Off' },
  enable_web_search: { true: 'On', false: 'Off' },
  background: { auto: 'Auto', transparent: 'Transparent', opaque: 'Opaque' },
  quality: { low: 'Low', medium: 'Medium', high: 'High' },
  input_fidelity: { low: 'Low', high: 'High' },
  image_size: { auto: 'Auto' },
  output_format: { jpeg: 'JPEG', png: 'PNG', webp: 'WebP' },
};

export function getParamLabel(name: string, locale: string): string {
  const map = locale === 'ru' ? PARAM_LABELS_RU : PARAM_LABELS_EN;
  return map[name] ?? name;
}

export function getParamValueLabel(
  paramName: string,
  val: string,
  locale: string
): string {
  const map = locale === 'ru' ? PARAM_VALUES_RU : PARAM_VALUES_EN;
  return map[paramName]?.[val] ?? val;
}
