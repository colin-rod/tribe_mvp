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
  // Explicitly expose environment variables to the client bundle
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
}

module.exports = nextConfig