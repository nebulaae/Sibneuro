'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  memo,
  type CSSProperties,
} from 'react';
import { ImageOff, RotateCw, Loader2 } from 'lucide-react';
import { cn, sanitizeMediaUrl } from '@/lib/utils';
import { proxiedMediaUrl } from '@/lib/media';
import { track } from '@/lib/logger';

interface SmartVideoProps {
  src?: string | null;
  poster?: string | null;
  className?: string;
  videoClassName?: string;
  fit?: 'cover' | 'contain';
  /** Активен ли ролик (в зоне видимости) — управляет preload и воспроизведением. */
  active?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  maxRetries?: number;
  onLoaded?: () => void;
  ctx?: Record<string, unknown>;
}

/**
 * Надёжный показ видео в мини-аппе.
 *
 * Решает жалобу «видео чёрное, пока полностью не прогрузится»:
 *  - держит лоадер/постер до первого готового кадра (loadeddata/canplay),
 *    а не чёрный прямоугольник;
 *  - плавно проявляет видео, как только оно МОЖЕТ играть (по мере буферизации,
 *    а не после полной загрузки) — поэтому ставим preload и не ждём 'canplaythrough';
 *  - при ошибке делает ретрай с cache-bust, затем переключается на same-origin
 *    прокси (/api/media с поддержкой Range) — обход сетевых ограничений РФ и
 *    отсутствия faststart/Range на исходном CDN;
 *  - после провала показывает видимый fallback с кнопкой «повторить».
 */
export const SmartVideo = memo(function SmartVideo({
  src,
  poster,
  className,
  videoClassName,
  fit = 'cover',
  active = true,
  autoPlay = true,
  loop = true,
  muted = true,
  controls = false,
  maxRetries = 1,
  onLoaded,
  ctx,
}: SmartVideoProps) {
  const clean = sanitizeMediaUrl(src);
  const cleanPoster = sanitizeMediaUrl(poster);
  const canProxy = !!clean && /^https?:\/\//i.test(clean);

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    clean ? 'loading' : 'error'
  );
  const [attempt, setAttempt] = useState(0);
  const [proxied, setProxied] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    setAttempt(0);
    setProxied(false);
    setStatus(clean ? 'loading' : 'error');
    startRef.current = clean ? Date.now() : 0;
    if (clean) track.media.start(clean, { kind: 'video', ...ctx });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clean]);

  // Управление воспроизведением по видимости: невидимые ролики ставим на паузу,
  // чтобы не жечь CPU/сеть (важно для плавности ленты).
  useEffect(() => {
    const v = videoRef.current;
    if (!v || status !== 'ready') return;
    if (active && autoPlay) {
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } else {
      v.pause();
    }
  }, [active, autoPlay, status]);

  const handleReady = useCallback(() => {
    setStatus('ready');
    track.media.loaded(clean, Date.now() - (startRef.current || Date.now()), {
      kind: 'video',
      attempt,
      proxied,
      ...ctx,
    });
    onLoaded?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clean, attempt, proxied, onLoaded]);

  const handleError = useCallback(() => {
    track.media.error(clean, attempt, { kind: 'video', ...ctx });
    if (attempt < maxRetries) {
      const next = attempt + 1;
      const t = setTimeout(() => {
        startRef.current = Date.now();
        setAttempt(next);
        setStatus('loading');
      }, 400 * Math.pow(2, attempt));
      return () => clearTimeout(t);
    }
    if (!proxied && canProxy) {
      const t = setTimeout(() => {
        startRef.current = Date.now();
        setProxied(true);
        setAttempt(0);
        setStatus('loading');
      }, 300);
      return () => clearTimeout(t);
    }
    track.media.gaveUp(clean, attempt + 1, { kind: 'video', ...ctx });
    setStatus('error');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clean, attempt, maxRetries, proxied, canProxy]);

  const retryManually = useCallback(() => {
    if (!clean) return;
    startRef.current = Date.now();
    if (canProxy) setProxied(true);
    setAttempt((a) => a + 1);
    setStatus('loading');
    track.media.start(clean, { kind: 'video', manual: true, ...ctx });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clean, canProxy]);

  const base = proxied ? proxiedMediaUrl(clean) : clean;
  const finalSrc =
    base && attempt > 0 && !proxied
      ? `${base}${base.includes('?') ? '&' : '?'}_r=${attempt}`
      : base;

  const objectFit = fit === 'contain' ? 'object-contain' : 'object-cover';
  // Активный ролик грузим целиком (autoPlay), фоновые — только метаданные,
  // чтобы не насыщать сеть и ускорить появление первого кадра.
  const preload = active ? 'auto' : 'metadata';

  const posterStyle: CSSProperties | undefined = cleanPoster
    ? {
        backgroundImage: `url("${cleanPoster}")`,
        backgroundSize: fit === 'contain' ? 'contain' : 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    : undefined;

  return (
    <div className={cn('relative overflow-hidden bg-zinc-900', className)}>
      {/* Постер/лоадер держим до первого готового кадра — никакого чёрного экрана */}
      {status === 'loading' && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-zinc-900"
          style={posterStyle}
        >
          <div className="absolute inset-0 bg-black/30" />
          <Loader2 className="size-6 animate-spin text-white/40 relative" />
        </div>
      )}

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
              Видео недоступно
            </span>
          )}
        </button>
      )}

      {clean && status !== 'error' && (
        <video
          key={finalSrc}
          ref={videoRef}
          src={finalSrc || undefined}
          poster={cleanPoster || undefined}
          autoPlay={autoPlay && active}
          loop={loop}
          muted={muted}
          controls={controls}
          playsInline
          preload={preload}
          // loadeddata = первый кадр готов (можно показывать); canplay = можно
          // начинать воспроизведение по мере буфера. Слушаем оба — что раньше.
          onLoadedData={handleReady}
          onCanPlay={handleReady}
          onError={handleError}
          className={cn(
            'absolute inset-0 w-full h-full transition-opacity duration-300',
            objectFit,
            status === 'ready' ? 'opacity-100' : 'opacity-0',
            videoClassName
          )}
        />
      )}
    </div>
  );
});
