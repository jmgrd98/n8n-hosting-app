import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Google profile images
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      // GitHub profile images
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
};

export default withNextIntl(nextConfig);
