const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const isDevelopment = process.env.NODE_ENV === 'development'

const createContentSecurityPolicy = () => {
  const directives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      // Next.js requires inline scripts for hydration
      "'unsafe-inline'",
      isDevelopment ? "'unsafe-eval'" : '',
      'https://va.vercel-scripts.com',
      'https://vercel.live',
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com',
    ].filter(Boolean),
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https:',
      'https://*.supabase.co',
      'https://*.supabase.in',
      'https://*.vercel.app',
      'https://*.vercel-analytics.com',
    ],
    'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
    'connect-src': [
      "'self'",
      'https://*.colinrodrigues.com',
      'https://*.supabase.co',
      'wss://*.supabase.co',
      'https://*.supabase.in',
      'wss://*.supabase.in',
      'https://va.vercel-scripts.com',
      'https://*.vercel-analytics.com',
      'https://www.google-analytics.com',
      'https://www.googletagmanager.com',
      'https://vercel.live',
      isDevelopment ? 'ws://localhost:*' : '',
      isDevelopment ? 'wss://localhost:*' : '',
      isDevelopment ? 'ws:' : '',
      isDevelopment ? 'wss:' : '',
    ].filter(Boolean),
    'frame-src': ["'self'", 'https://vercel.live'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'media-src': ["'self'", 'https://*.supabase.co', 'https://*.supabase.in'],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
  }

  if (!isDevelopment) {
    directives['upgrade-insecure-requests'] = []
  }

  return Object.entries(directives)
    .map(([key, values]) => {
      if (!values.length) {
        return key
      }
      return `${key} ${values.join(' ')}`
    })
    .join('; ')
}

const createSecurityHeaders = () => {
  const headers = [
    {
      key: 'Content-Security-Policy',
      value: createContentSecurityPolicy(),
    },
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff',
    },
    {
      key: 'X-Frame-Options',
      value: 'DENY',
    },
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin',
    },
    {
      key: 'Permissions-Policy',
      value: ['camera=()', 'microphone=()', 'geolocation=()', 'interest-cohort=()'].join(', '),
    },
    {
      key: 'X-XSS-Protection',
      value: '1; mode=block',
    },
  ]

  if (!isDevelopment) {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=31536000; includeSubDomains',
    })
  }

  return headers
}

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
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  eslint: {
    dirs: ['src'],
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: createSecurityHeaders(),
      },
    ]
  },
  // Explicitly define environment variables for client-side access
  // This ensures they're available during both build and runtime
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
}

module.exports = withBundleAnalyzer(nextConfig)
