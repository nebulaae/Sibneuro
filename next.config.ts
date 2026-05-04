import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  devIndicators: false,
};

const withNextIntl = createNextIntlPlugin('./app/i18n/requests.ts');

export default withNextIntl(nextConfig);
