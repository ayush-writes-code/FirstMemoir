/** @type {import('next').NextConfig} */
const r2Hostname = process.env.NEXT_PUBLIC_R2_PUBLIC_URL 
  ? new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_URL).hostname 
  : 'pub-cbf2a823886f4d379eba3abf625d08ac.r2.dev';

const nextConfig = {
  transpilePackages: ['@repo/api-client'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: r2Hostname,
      }
    ],
  },
};
export default nextConfig;
