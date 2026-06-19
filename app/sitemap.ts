import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

/**
 * Статический sitemap для публичных разделов. Динамические URL трендов можно
 * добавить позже, когда появится серверный листинг постов для билда.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/trends', '/generate', '/models'];
  return routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: path === '/trends' ? 'hourly' : 'daily',
    priority: path === '' ? 1 : 0.7,
  }));
}
