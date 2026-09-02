/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output:
    process.env.BUILD_STANDALONE === 'true' ||
    (process.env.NODE_ENV === 'production' && process.platform !== 'win32')
      ? 'standalone'
      : undefined,
  async redirects() {
    return [
      {
        source: '/request',
        destination: '/requests',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
