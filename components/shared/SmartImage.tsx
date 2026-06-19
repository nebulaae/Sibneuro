'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { ImageOff, RotateCw, Loader2 } from 'lucide-react';
import { cn, sanitizeMediaUrl } from '@/lib/utils';
import { track } from '@/lib/logger';

interface SmartImageProps {
  src?: string | null;
  alt?: string;
  /** Классы обёртки (позиционирование задаёт родитель). */
  className?: string;
  /** Дополнительные классы самого <img>. */
  imgClassName?: string;
  loading?: 'eager' | 'lazy';
  fit?: 'cover' | 'contain';
  /** Сколько раз пытаться перезагрузить при ошибке (с cache-bust). */
  maxRetries?: number;
  onLoaded?: () => void;
  /** Контекст для телеметрии (например postId). */
  ctx?: Record<string, unknown>;
}

/**
 * Надёжный показ изображений в мини-аппе.
 *
 * Решает массовую жалобу «чёрный экран → белый экран → картинка не появляется»:
 *  - чинит битый URL (sanitizeMediaUrl: %0A/пробелы/zero-width);
 *  - вместо мигания пустым/чёрным фоном держит стабильный скелетон до onLoad;
 *  - при onError делает несколько ретраев с cache-bust (важно для S3/CDN,
 *    которые могут отдавать 403/таймаут на холодном объекте при whitelist);
 *  - после исчерпания ретраев показывает видимый fallback с кнопкой «повторить»,
 *    а не «вечный» пустой блок;
 *  - пишет телеметрию (load_start/ok/error/failed) для разбора инцидентов.
 */
export const SmartImage = memo(function SmartImage({
  src,
  alt = '',
  className,
  imgClassName,
  loading = 'lazy',
  fit = 'cover',
  maxRetries = 2,
  onLoaded,
  ctx,
}: SmartImageProps) {
  const clean = sanitizeMediaUrl(src);

  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(
    clean ? 'loading' : 'error'
  );
  const [attempt, setAttempt] = useState(0);
  const startRef = useRef<number>(0);

  // Логируем, если URL был фактически починен — это сигнал о порче ссылок выше по стеку.
  useEffect(() => {
    if (src && clean && src !== clean) track.media.sanitized(src, clean);
  }, [src, clean]);

  // Сброс при смене источника.
  useEffect(() => {
    setAttempt(0);
    setStatus(clean ? 'loading' : 'error');
    startRef.current = clean ? Date.now() : 0;
    if (clean) track.media.start(clean, ctx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clean]);

  const handleLoad = useCallback(() => {
    setStatus('loaded');
    track.media.loaded(clean, Date.now() - (startRef.current || Date.now()), {
      attempt,
      ...ctx,
    });
    onLoaded?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clean, attempt, onLoaded]);

  const handleError = useCallback(() => {
    track.media.error(clean, attempt, ctx);
    if (attempt < maxRetries) {
      // Небольшая задержка + cache-bust на следующем рендере.
      const next = attempt + 1;
      const t = setTimeout(() => {
        startRef.current = Date.now();
        setAttempt(next);
        setStatus('loading');
      }, 400 * next);
      return () => clearTimeout(t);
    }
    track.media.gaveUp(clean, attempt + 1, ctx);
    setStatus('error');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clean, attempt, maxRetries]);

  const retryManually = useCallback(() => {
    if (!clean) return;
    startRef.current = Date.now();
    setAttempt((a) => a + 1);
    setStatus('loading');
    track.media.start(clean, { manual: true, ...ctx });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clean]);

  // cache-bust только на ретраях, чтобы не ломать кэш первой загрузки.
  const finalSrc =
    clean && attempt > 0
      ? `${clean}${clean.includes('?') ? '&' : '?'}_r=${attempt}`
      : clean;

  const objectFit = fit === 'contain' ? 'object-contain' : 'object-cover';

  return (
    <div className={cn('relative overflow-hidden bg-zinc-900', className)}>
      {/* Скелетон / лоадер — держим до loaded, чтобы не было чёрно-белого мигания */}
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 animate-pulse">
          <Loader2 className="size-6 animate-spin text-white/25" />
        </div>
      )}

      {/* Видимый fallback вместо «вечного» пустого блока */}
      {status === 'error' && (
        <button
          type="button"
          onClick={retryManually}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-900 text-white/40 active:scale-[0.98] transition-transform"
        >
          <ImageOff className="size-7" />
          {clean ? (
            <span className="flex items-center gap-1.5 text-[12px] font-bold">
              <RotateCw className="size-3.5" /> Повторить
            </span>
          ) : (
            <span className="text-[11px] font-medium px-4 text-center">
              Изображение недоступно
            </span>
          )}
        </button>
      )}

      {clean && status !== 'error' && (
        // next/image не настроен под удалённые S3-домены; по всему приложению — нативный <img>.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={finalSrc}
          src={finalSrc}
          alt={alt}
          loading={loading}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'absolute inset-0 w-full h-full transition-opacity duration-300',
            objectFit,
            status === 'loaded' ? 'opacity-100' : 'opacity-0',
            imgClassName
          )}
        />
      )}
    </div>
  );
});
