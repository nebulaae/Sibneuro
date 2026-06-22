import { NextRequest } from 'next/server';

/**
 * Инлайновый прокси медиа (картинки/видео) с поддержкой Range.
 *
 * Зачем: в РФ часть CDN/S3-доменов нестабильна или режется сетевыми
 * ограничениями — прямой запрос из браузера падает (таймаут/403/reset),
 * картинка/видео не грузится. Прокси ходит за файлом с сервера (другой
 * сетевой путь) и отдаёт его с того же origin, что и мини-апп.
 *
 * В отличие от /api/download (он форсит attachment-скачивание), этот роут
 * отдаёт `inline`, пробрасывает Range → отдаёт 206 Partial Content, поэтому
 * <video> может стримиться и проигрываться ПО МЕРЕ загрузки, а не чёрным
 * экраном до полного скачивания.
 */

export const runtime = 'nodejs';
// Прокси динамический — не кэшируем сам ответ роутера, но отдаём
// долгоживущие Cache-Control заголовки для самого медиа.
export const dynamic = 'force-dynamic';

const BLOCKED_HOST_RE =
  /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/i;

function isAllowed(raw: string): URL | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  // Базовая защита от SSRF к внутренней сети.
  if (BLOCKED_HOST_RE.test(u.hostname)) return null;
  return u;
}

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get('url');
  if (!urlParam) {
    return new Response('Missing url parameter', { status: 400 });
  }

  const target = isAllowed(urlParam);
  if (!target) {
    return new Response('Invalid or blocked url', { status: 400 });
  }

  const range = request.headers.get('range');

  try {
    const upstream = await fetch(target.toString(), {
      // Range пробрасываем для стриминга видео.
      headers: range ? { Range: range } : undefined,
      // Доверяем редиректам CDN.
      redirect: 'follow',
      cache: 'no-store',
    });

    if (!upstream.ok && upstream.status !== 206) {
      return new Response(`Upstream error: ${upstream.status}`, {
        status: 502,
      });
    }

    const headers = new Headers();
    const passthrough = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'etag',
      'last-modified',
    ];
    for (const h of passthrough) {
      const v = upstream.headers.get(h);
      if (v) headers.set(h, v);
    }

    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/octet-stream');
    }
    if (!headers.has('accept-ranges')) {
      headers.set('accept-ranges', 'bytes');
    }
    headers.set('content-disposition', 'inline');
    // Иммутабельный медиа-объект → агрессивно кэшируем у клиента/edge.
    headers.set('cache-control', 'public, max-age=31536000, immutable');

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Proxy failed';
    return new Response(message, { status: 502 });
  }
}
