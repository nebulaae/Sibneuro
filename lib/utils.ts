import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
