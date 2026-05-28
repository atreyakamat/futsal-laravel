/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typedRoutes: true,
  webpack: (config) => {
    config.output.hashFunction = 'md4';
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
      },
    ],
  },
};

export default nextConfig;