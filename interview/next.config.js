/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['localhost', 'weaviate'],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
    WEAVIATE_HOST: process.env.WEAVIATE_HOST || 'localhost:8081',
  },
  experimental: {
    serverComponentsExternalPackages: ['weaviate-ts-client'],
  },
};

module.exports = nextConfig;
