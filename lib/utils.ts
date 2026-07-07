import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Нормализует URL медиа, повреждённый при вставке/копировании.
 *
 * Чинит реальный продакшн-кейс: ссылка на S3 приходит с `%0A`, `%0D`,
 * переносами строк, табами и «пробелами внутри URL» — становится невалидной,
 * превью не грузится, генерация падает. Применять на КАЖДОЙ границе, где URL
 * приходит извне (paste/link-dialog), и перед рендером <img>/<video>.
 *
 * Стратегия:
 *  - срезаем обрамляющие кавычки/угловые скобки/пробелы от копипасты;
 *  - убираем закодированные пробельные символы (%0A/%0D/%09);
 *  - убираем ЛЮБЫЕ «сырые» пробелы/переносы/табы и zero-width/BOM в любом
 *    месте строки (легитимные пробелы в путях закодированы как %20 — их не трогаем);
 *  - пропускаем только http(s)/protocol-relative/root-relative/data/blob;
 *    всё прочее считаем мусором и возвращаем '' (вызов решает, что показать).
 */
export function sanitizeMediaUrl(input?: string | null): string {
  if (!input || typeof input !== 'string') return '';

  let url = input.trim();
  // Обрамляющие кавычки/скобки/пробелы от копипасты из чатов/писем.
  url = url.replace(/^['"`<\s]+/, '').replace(/['"`>\s]+$/, '');
  // Закодированные пробельные символы.
  url = url.replace(/%0[ad]/gi, '').replace(/%09/gi, '');
  // «Сырые» пробелы/переносы/табы + zero-width (200B-200D) + BOM (FEFF).
  url = url.replace(/[\s​-‍﻿]+/g, '');

  if (!url) return '';

  if (/^(https?:)?\/\//i.test(url)) return url;
  if (/^(data:|blob:|\/)/i.test(url)) return url;

  return '';
}

export function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return 'только что';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} м`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ч`;
  return `${Math.floor(diff / 86_400_000)} д`;
}

export function localize(v: any, lang = 'ru'): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  return v[lang] || v.en || v.ru || Object.values(v)[0] || '';
}

export function cleanModelName(name: string | null | undefined): string {
  if (!name) return '';
  return name.replace(/^sosana\//i, '');
}

/**
 * Форматирует банковские реквизиты (номер карты / счёта / телефона),
 * разбивая цифры на группы по 4: "4444555566667777" → "4444 5555 6666 7777".
 * Если в строке есть буквы (крипто-адрес и т.п.) — оставляем как есть.
 */
export function formatBankRequisites(value: string): string {
  if (/[a-zA-Zа-яА-Я]/.test(value)) return value;
  const digits = value.replace(/\D/g, '');
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}
