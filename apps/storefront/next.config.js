/** @type {import('next').NextConfig} */
const configuredR2Hostname = process.env.NEXT_PUBLIC_R2_PUBLIC_URL
  ? (() => {
      try {
        return new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_URL).hostname;
      } catch {
        return null;
      }
    })()
  : null;

const remotePatterns = [
  {
    protocol: 'https',
    hostname: 'images.unsplash.com',
  },
  {
    protocol: 'https',
    hostname: 'pub-c0dc396fc2f245cca9ef062272bb82f4.r2.dev',
  },
  {
    protocol: 'https',
    hostname: 'pub-cbf2a823886f4d379eba3abf625d08ac.r2.dev',
  },
  {
    protocol: 'https',
    hostname: '*.r2.dev',
  },
];

if (configuredR2Hostname && !remotePatterns.some((p) => p.hostname === configuredR2Hostname)) {
  remotePatterns.push({
    protocol: 'https',
    hostname: configuredR2Hostname,
  });
}

const nextConfig = {
  transpilePackages: ['@repo/api-client'],
  images: {
    remotePatterns,
  },
};
export default nextConfig;
