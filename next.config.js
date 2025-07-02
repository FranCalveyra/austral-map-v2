/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Only use static export in CI/CD environment for GitHub Pages
  ...(process.env.GITHUB_ACTIONS && {
    output: 'export',
    trailingSlash: true,
    basePath: '/austral-map-v2',
    assetPrefix: '/austral-map-v2/',
  }),
};

module.exports = nextConfig;
