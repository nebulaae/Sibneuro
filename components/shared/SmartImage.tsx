'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { ImageOff, RotateCw, Loader2 } from 'lucide-react';
import { cn, sanitizeMediaUrl } from '@/lib/utils';
import { proxiedMediaUrl } from '@/lib/media';
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
  // После исчерпания прямых ретраев пробуем same-origin прокси (обход
  // сетевых ограничений РФ) перед тем как сдаться.
  const [proxied, setProxied] = useState(false);
  const canProxy = !!clean && /^https?:\/\//i.test(clean);
  const startRef = useRef<number>(0);

  // Логируем, если URL был фактически починен — это сигнал о порче ссылок выше по стеку.
  useEffect(() => {
    if (src && clean && src !== clean) track.media.sanitized(src, clean);
  }, [src, clean]);

  // Сброс при смене источника.
  useEffect(() => {
    setAttempt(0);
    setProxied(false);
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
      // Экспоненциальная задержка + cache-bust на следующем рендере.
      const next = attempt + 1;
      const t = setTimeout(() => {
        startRef.current = Date.now();
        setAttempt(next);
        setStatus('loading');
      }, 400 * Math.pow(2, attempt));
      return () => clearTimeout(t);
    }
    // Прямые ретраи исчерпаны — пробуем через прокси (другой сетевой путь).
    if (!proxied && canProxy) {
      const t = setTimeout(() => {
        startRef.current = Date.now();
        setProxied(true);
        setAttempt(0);
        setStatus('loading');
      }, 300);
      return () => clearTimeout(t);
    }
    track.media.gaveUp(clean, attempt + 1, ctx);
    setStatus('error');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clean, attempt, maxRetries, proxied, canProxy]);

  const retryManually = useCallback(() => {
    if (!clean) return;
    startRef.current = Date.now();
    // Ручной повтор сразу идёт через прокси, если прямой путь уже не сработал.
    if (canProxy) setProxied(true);
    setAttempt((a) => a + 1);
    setStatus('loading');
    track.media.start(clean, { manual: true, ...ctx });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clean, canProxy]);

  const base = proxied ? proxiedMediaUrl(clean) : clean;
  // cache-bust только на прямых ретраях, чтобы не ломать кэш первой загрузки
  // (для прокси не нужен — это уже свежий same-origin путь).
  const finalSrc =
    base && attempt > 0 && !proxied
      ? `${base}${base.includes('?') ? '&' : '?'}_r=${attempt}`
      : base;

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
          // Часть CDN/S3 отдаёт 403 при наличии Referer (hotlink-protection);
          // без него ссылка грузится стабильнее.
          referrerPolicy="no-referrer"
          fetchPriority={loading === 'eager' ? 'high' : 'auto'}
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
