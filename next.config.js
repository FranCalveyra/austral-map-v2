/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Only use static export when explicitly set for GitHub Pages deployment
  ...(process.env.STATIC_EXPORT === 'true' && {
    output: 'export',
    trailingSlash: true,
    basePath: '/austral-map-v2',
    assetPrefix: '/austral-map-v2/',
    // Skip API routes during static export as they require a server
    generateBuildId: () => 'static-build',
  }),
};

module.exports = nextConfig;
