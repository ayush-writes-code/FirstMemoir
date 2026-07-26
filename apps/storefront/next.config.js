/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@repo/api-client'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};
export default nextConfig;
