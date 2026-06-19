import type { Metadata } from 'next';

/**
 * Централизованная SEO-конфигурация.
 *
 * Прод-домен задаётся через NEXT_PUBLIC_SITE_URL. Если переменной нет —
 * используем заглушку (её нужно заменить на реальный домен в окружении).
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://sibneuro.app'
).replace(/\/$/, '');

export const SITE_NAME = 'Sibneuro';
export const SITE_TAGLINE_RU =
  'AI-студия: генерация фото, видео, музыки и чат с нейросетями';
export const SITE_DESCRIPTION_RU =
  'Десятки нейросетей для генерации изображений, видео, музыки и общения в одном приложении: GPT, Kling, Suno, Nano Banana и другие. Быстрый старт прямо в Telegram.';

export const OG_IMAGE = `${SITE_URL}/logo.png`;

/** Базовые метаданные приложения (используются в корневом layout). */
export const defaultMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE_RU}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION_RU,
  applicationName: SITE_NAME,
  keywords: [
    'нейросеть',
    'генерация изображений',
    'генерация видео',
    'AI',
    'искусственный интеллект',
    'GPT',
    'Kling',
    'Suno',
    'Telegram Mini App',
    'ИИ генерация',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE_RU}`,
    description: SITE_DESCRIPTION_RU,
    url: SITE_URL,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${SITE_TAGLINE_RU}`,
    description: SITE_DESCRIPTION_RU,
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
};

/** JSON-LD: организация + сайт + приложение (вставляется в корневой layout). */
export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#org`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: OG_IMAGE,
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: SITE_URL,
        publisher: { '@id': `${SITE_URL}/#org` },
        inLanguage: 'ru-RU',
      },
      {
        '@type': 'SoftwareApplication',
        name: SITE_NAME,
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Web, iOS, Android',
        description: SITE_DESCRIPTION_RU,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'RUB' },
      },
    ],
  };
}

/** JSON-LD для отдельной генерации/тренда (ImageObject / VideoObject). */
export function trendJsonLd(opts: {
  id: number | string;
  name: string;
  mediaUrl?: string | null;
  isVideo?: boolean;
  createdAt?: string;
}) {
  const url = `${SITE_URL}/trend/${opts.id}`;
  return {
    '@context': 'https://schema.org',
    '@type': opts.isVideo ? 'VideoObject' : 'ImageObject',
    name: opts.name,
    url,
    ...(opts.mediaUrl
      ? opts.isVideo
        ? { contentUrl: opts.mediaUrl, thumbnailUrl: opts.mediaUrl }
        : { contentUrl: opts.mediaUrl }
      : {}),
    ...(opts.createdAt ? { uploadDate: opts.createdAt } : {}),
    isPartOf: { '@id': `${SITE_URL}/#website` },
  };
}
