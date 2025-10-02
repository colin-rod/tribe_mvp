/**
 * Content Security Policy (CSP) Configuration
 *
 * This module provides a comprehensive CSP configuration to prevent XSS attacks,
 * clickjacking, and other code injection vulnerabilities.
 */

/**
 * Generate CSP directives based on environment
 *
 * @param _nonce - Optional nonce value for script security in production (reserved for future use)
 */
export function getContentSecurityPolicy(_nonce?: string): string {
  const isDevelopment = process.env.NODE_ENV === 'development'

  // CSP directives
  const directives: Record<string, string[]> = {
    // Default source - restrict to same origin
    'default-src': ["'self'"],

    // Script sources - allow specific trusted domains
    'script-src': [
      "'self'",
      // Allow inline scripts for Next.js
      // In production, use nonce or unsafe-inline for Next.js hydration
      isDevelopment ? "'unsafe-inline'" : '',
      isDevelopment ? "'unsafe-eval'" : '',
      // For production Next.js 15, we need to allow inline scripts
      // Next.js requires this for hydration and client-side scripts
      !isDevelopment ? "'unsafe-inline'" : '',
      // Vercel services
      'https://va.vercel-scripts.com',
      'https://vercel.live',
      // Google Tag Manager (if needed)
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com'
    ].filter(Boolean),

    // Style sources
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for Tailwind CSS and styled-jsx
      'https://fonts.googleapis.com'
    ],

    // Image sources
    'img-src': [
      "'self'",
      'data:', // Allow data URIs for inline images
      'blob:', // Allow blob URLs for uploaded images
      'https:', // Allow HTTPS images from any source (could be more restrictive)
      // Supabase Storage
      'https://*.supabase.co',
      'https://*.supabase.in',
      // Vercel
      'https://*.vercel.app',
      'https://*.vercel-analytics.com'
    ],

    // Font sources
    'font-src': [
      "'self'",
      'data:',
      'https://fonts.gstatic.com'
    ],

    // Connect sources (API endpoints, WebSockets)
    'connect-src': [
      "'self'",
      // Custom domain
      'https://*.colinrodrigues.com',
      // Supabase
      'https://*.supabase.co',
      'https://*.supabase.in',
      // Vercel Analytics and Live
      'https://va.vercel-scripts.com',
      'https://*.vercel-analytics.com',
      'https://vercel.live',
      // Allow WebSocket connections in development
      isDevelopment ? 'ws://localhost:*' : '',
      isDevelopment ? 'wss://localhost:*' : '',
      isDevelopment ? 'ws:' : '',
      isDevelopment ? 'wss:' : ''
    ].filter(Boolean),

    // Frame sources (embedded content)
    'frame-src': [
      "'self'",
      'https://vercel.live',
      // Add trusted domains for embedded content if needed
    ],

    // Object sources (Flash, Java applets, etc.)
    'object-src': ["'none'"],

    // Base URI restriction
    'base-uri': ["'self'"],

    // Form action restriction
    'form-action': ["'self'"],

    // Frame ancestors (clickjacking protection)
    'frame-ancestors': ["'none'"],

    // Media sources (audio, video)
    'media-src': [
      "'self'",
      'https://*.supabase.co',
      'https://*.supabase.in'
    ],

    // Worker sources (Web Workers, Service Workers)
    'worker-src': [
      "'self'",
      'blob:'
    ],

    // Manifest sources (PWA manifests)
    'manifest-src': ["'self'"],

    // Upgrade insecure requests (HTTP to HTTPS)
    ...(isDevelopment ? {} : { 'upgrade-insecure-requests': [] })
  }

  // Convert directives object to CSP string
  return Object.entries(directives)
    .map(([key, values]) => {
      if (values.length === 0) {
        return key
      }
      return `${key} ${values.join(' ')}`
    })
    .join('; ')
}

/**
 * Security headers configuration
 */
export function getSecurityHeaders() {
  const csp = getContentSecurityPolicy()

  return {
    // Content Security Policy
    'Content-Security-Policy': csp,

    // Prevent browsers from incorrectly detecting non-scripts as scripts
    'X-Content-Type-Options': 'nosniff',

    // Prevent clickjacking attacks
    'X-Frame-Options': 'DENY',

    // Enable browser's XSS filter
    'X-XSS-Protection': '1; mode=block',

    // Referrer policy - control referrer information
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Permissions policy (formerly Feature Policy)
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'interest-cohort=()'
    ].join(', '),

    // HSTS (HTTP Strict Transport Security)
    // Only in production and over HTTPS
    ...(process.env.NODE_ENV === 'production' ? {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    } : {})
  }
}

/**
 * Apply security headers to a NextResponse
 */
export function applySecurityHeaders(headers: Headers): Headers {
  const securityHeaders = getSecurityHeaders()

  Object.entries(securityHeaders).forEach(([key, value]) => {
    headers.set(key, value)
  })

  return headers
}

/**
 * CSP reporting endpoint configuration
 * Use this to collect CSP violation reports
 */
export function getCspReportUri(): string | null {
  // Set this to your CSP reporting endpoint
  // Example: 'https://your-domain.com/api/csp-report'
  const reportUri = process.env.CSP_REPORT_URI

  if (!reportUri) {
    return null
  }

  return reportUri
}

/**
 * Generate CSP with report-uri directive
 */
export function getContentSecurityPolicyWithReporting(): string {
  let csp = getContentSecurityPolicy()

  const reportUri = getCspReportUri()
  if (reportUri) {
    csp += `; report-uri ${reportUri}`
  }

  return csp
}
