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
    instrumentationHook: true,
    serverComponentsExternalPackages: ['weaviate-ts-client'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push(
        { perf_hooks: 'commonjs perf_hooks' },
        { diagnostics_channel: 'commonjs diagnostics_channel' },
        { path: 'commonjs path' },
        { stream: 'commonjs stream' }
      );
    }
    return config;
  },
};

module.exports = nextConfig;
