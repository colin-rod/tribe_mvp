import { getEnv, getFeatureFlags } from '@/lib/env'
import { createLogger } from '@/lib/logger'

const logger = createLogger('middleware-startup-validation')

export interface StartupConfiguration {
  env: ReturnType<typeof getEnv>
  features: ReturnType<typeof getFeatureFlags>
}

let cachedConfiguration: StartupConfiguration | null = null
let cachedError: Error | null = null

export function resetStartupValidationCache() {
  cachedConfiguration = null
  cachedError = null
}

export function ensureStartupConfiguration(): StartupConfiguration {
  if (cachedError) {
    throw cachedError
  }

  if (cachedConfiguration) {
    return cachedConfiguration
  }

  try {
    const env = getEnv()
    const features = getFeatureFlags()

    if (!features.supabaseEnabled) {
      const error = new Error(
        'Application startup failed: Supabase is not properly configured. '
          + 'This application requires valid NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY '
          + 'environment variables to function. Please check your environment configuration.'
      )

      logger.error('Startup validation failed - Supabase not enabled', {
        hasUrl: !!env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        nodeEnv: process.env.NODE_ENV,
        context: 'middleware-startup-validation'
      })

      throw error
    }

    if (env.NEXT_PUBLIC_SUPABASE_URL === 'http://localhost:54321' && process.env.NODE_ENV === 'production') {
      const error = new Error(
        'Production environment detected but Supabase URL is set to localhost. '
          + 'Please configure a production Supabase URL.'
      )

      logger.error('Production environment with localhost Supabase URL', {
        url: env.NEXT_PUBLIC_SUPABASE_URL,
        nodeEnv: process.env.NODE_ENV,
        context: 'middleware-startup-validation'
      })

      throw error
    }

    if (env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'development-fallback-key') {
      const error = new Error(
        'Supabase anonymous key is set to a development fallback value. '
          + 'Please configure a valid Supabase anonymous key.'
      )

      logger.error('Development fallback key detected', {
        nodeEnv: process.env.NODE_ENV,
        context: 'middleware-startup-validation'
      })

      throw error
    }

    logger.debug('Startup validation successful', {
      supabaseEnabled: features.supabaseEnabled,
      emailEnabled: features.emailEnabled,
      urlDomain: new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname,
      nodeEnv: process.env.NODE_ENV,
      context: 'middleware-startup-validation'
    })

    cachedConfiguration = { env, features }
    return cachedConfiguration
  } catch (error) {
    const validationError = error instanceof Error ? error : new Error(String(error))
    logger.errorWithStack('Startup validation failed - application cannot continue', validationError)
    cachedError = validationError
    throw validationError
  }
}
