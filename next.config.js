/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  output: 'export',
  trailingSlash: true,
  basePath: process.env.NODE_ENV === 'production' ? '/austral-map-v2' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/austral-map-v2/' : '',
};

module.exports = nextConfig;
