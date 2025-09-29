'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { createLogger } from '../logger'

const logger = createLogger('supabase-client')

type SupabaseClientType = SupabaseClient<Database>

/**
 * Validates that required Supabase environment variables are present and valid
 */
function validateSupabaseEnvironment(): { url: string; key: string } {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const isBuildTime = process.env.CI === 'true' || process.env.NODE_ENV === 'test'

  // During build time (CI), use fallback values to prevent build failures
  if (isBuildTime && (!supabaseUrl || !supabaseAnonKey)) {
    logger.warn('Using fallback Supabase credentials for build process', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      isBuildTime,
      context: 'supabase-client-fallback'
    })
    return {
      url: supabaseUrl || 'https://placeholder.supabase.co',
      key: supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDU0ODYzOTIsImV4cCI6MTk2MTA2MjM5Mn0.placeholder'
    }
  }

  // Check for missing environment variables
  if (!supabaseUrl) {
    const error = new Error(
      'NEXT_PUBLIC_SUPABASE_URL is required but not configured. ' +
      'Please set this environment variable in your .env.local file. ' +
      'Get this value from your Supabase project settings.'
    )
    logger.error('Missing required Supabase URL', {
      hasUrl: false,
      hasKey: !!supabaseAnonKey,
      nodeEnv: process.env.NODE_ENV,
      context: 'supabase-client-validation'
    })
    throw error
  }

  if (!supabaseAnonKey) {
    const error = new Error(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY is required but not configured. ' +
      'Please set this environment variable in your .env.local file. ' +
      'Get this value from your Supabase project settings.'
    )
    logger.error('Missing required Supabase anonymous key', {
      hasUrl: !!supabaseUrl,
      hasKey: false,
      nodeEnv: process.env.NODE_ENV,
      context: 'supabase-client-validation'
    })
    throw error
  }

  // Validate URL format
  try {
    new URL(supabaseUrl)
  } catch {
    const error = new Error(
      `NEXT_PUBLIC_SUPABASE_URL is not a valid URL: "${supabaseUrl}". ` +
      'Expected format: https://your-project.supabase.co'
    )
    logger.error('Invalid Supabase URL format', {
      url: supabaseUrl.substring(0, 50) + '...',
      nodeEnv: process.env.NODE_ENV,
      context: 'supabase-client-validation'
    })
    throw error
  }

  // Validate key format (should be a JWT-like string)
  // Allow shorter keys during build time for CI/testing
  const minKeyLength = isBuildTime ? 50 : 100
  if (supabaseAnonKey.length < minKeyLength || !supabaseAnonKey.includes('.')) {
    const error = new Error(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY appears to be invalid. ' +
      'Expected a JWT-like token from your Supabase project settings.'
    )
    logger.error('Invalid Supabase anonymous key format', {
      keyLength: supabaseAnonKey.length,
      hasDotsInKey: supabaseAnonKey.includes('.'),
      minKeyLength,
      isBuildTime,
      nodeEnv: process.env.NODE_ENV,
      context: 'supabase-client-validation'
    })
    throw error
  }

  // Check for development fallback values that should not be used in production
  if (process.env.NODE_ENV === 'production' && !isBuildTime) {
    if (supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1')) {
      const error = new Error(
        'Production build detected but NEXT_PUBLIC_SUPABASE_URL points to localhost. ' +
        'Please configure a production Supabase URL.'
      )
      logger.error('Localhost Supabase URL in production', {
        url: supabaseUrl.substring(0, 50) + '...',
        nodeEnv: process.env.NODE_ENV,
        context: 'supabase-client-validation'
      })
      throw error
    }

    if (supabaseAnonKey === 'development-fallback-key' || supabaseAnonKey.startsWith('dev-') || supabaseAnonKey.includes('placeholder')) {
      const error = new Error(
        'Production build detected but NEXT_PUBLIC_SUPABASE_ANON_KEY appears to be a development fallback value. ' +
        'Please configure a production Supabase anonymous key.'
      )
      logger.error('Development fallback key in production', {
        keyPrefix: supabaseAnonKey.substring(0, 20) + '...',
        nodeEnv: process.env.NODE_ENV,
        context: 'supabase-client-validation'
      })
      throw error
    }
  }

  logger.debug('Supabase environment validation successful', {
    hasUrl: true,
    hasKey: true,
    urlDomain: new URL(supabaseUrl).hostname,
    keyLength: supabaseAnonKey.length,
    nodeEnv: process.env.NODE_ENV,
    isProduction: process.env.NODE_ENV === 'production'
  })

  return { url: supabaseUrl, key: supabaseAnonKey }
}

export function createClient() {
  try {
    // Validate environment before creating client
    const { url, key } = validateSupabaseEnvironment()

    logger.debug('Creating Supabase browser client', {
      urlDomain: new URL(url).hostname,
      keyLength: key.length,
      nodeEnv: process.env.NODE_ENV,
      context: 'supabase-client-creation'
    })

    return createBrowserClient<Database>(url, key)
  } catch (error) {
    const isBuildTime = process.env.CI === 'true' || process.env.NODE_ENV === 'test'

    logger.errorWithStack('Failed to create Supabase client - application cannot continue', error as Error)

    // During build time, allow fallback to prevent CI failures
    if (isBuildTime) {
      logger.warn('Using placeholder Supabase client for build process', {
        nodeEnv: process.env.NODE_ENV,
        isBuildTime,
        error: (error as Error).message,
        context: 'supabase-client-build-fallback'
      })

      // Return a minimal mock client for build purposes
      return createBrowserClient<Database>(
        'https://placeholder.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDU0ODYzOTIsImV4cCI6MTk2MTA2MjM5Mn0.placeholder'
      )
    }

    // In production runtime, fail fast - don't provide fallbacks that mask real issues
    if (process.env.NODE_ENV === 'production') {
      logger.error('Production Supabase client creation failed - terminating', {
        nodeEnv: process.env.NODE_ENV,
        error: (error as Error).message,
        context: 'supabase-client'
      })
      throw error
    }

    // In development, also fail fast to encourage proper configuration
    logger.error('Development Supabase client creation failed - check your environment configuration', {
      nodeEnv: process.env.NODE_ENV,
      error: (error as Error).message,
      help: 'Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local'
    })
    throw error
  }
}

// Mock client removed - application will fail fast if Supabase is not properly configured
// This ensures production issues are caught early rather than masked by fallbacks

// Export a lazy-loaded singleton instance for use in client components
let _supabase: ReturnType<typeof createClient> | null = null

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_, prop) {
    if (!_supabase) {
      _supabase = createClient()
    }
    return (_supabase as SupabaseClientType)[prop as keyof SupabaseClientType]
  }
})
