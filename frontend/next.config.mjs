import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Optional isolated build dir — lets a verify instance run alongside another
  // dev server without racing on the shared `.next` (set via NEXT_DIST_DIR).
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
};

export default withNextIntl(nextConfig);
