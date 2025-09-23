/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['sharp'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'advbcfkisejskhskrmqw.supabase.co',
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'https',
        hostname: 'colinrodrigues.com',
      },
      {
        protocol: 'https',
        hostname: 'www.colinrodrigues.com',
      },
    ],
  },
  eslint: {
    // ESLint errors will now prevent production builds
    dirs: ['src'],
    // Allow warnings during build but still fail on errors
    ignoreDuringBuilds: false,
  },
  typescript: {
    // TypeScript errors will now prevent production builds
    // Enables strict type checking during build
  },
}

module.exports = nextConfig