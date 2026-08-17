'use client';

import { useEffect } from 'react';
import { configureMiniAppViewport } from '@/lib/platform';

/**
 * Разворачивает мини-апп на весь экран (Telegram fullscreen / Max expand)
 * и публикует безопасные отступы в CSS-переменные --sa-*.
 *
 * Монтируется один раз в корневом layout и намеренно НЕ проверяет source:
 * на первом рендере он ещё не определён, а сам вызов безопасен в обычном
 * браузере — там просто нет объекта WebApp.
 */
export const ViewportProvider = () => {
  useEffect(() => configureMiniAppViewport(), []);
  return null;
};
