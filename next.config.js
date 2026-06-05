/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@std/testing/mock': false,
      '@std/testing/bdd': false,
      '@gadicc/fetch-mock-cache': false,
      '@gadicc/fetch-mock-cache/drivers/fs': false,
    };
    return config;
  },
};

module.exports = nextConfig;
