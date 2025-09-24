import { z } from 'zod'
import { createLogger } from './logger'

const logger = createLogger('env-validation')

/**
 * Environment validation schema with zod
 * Separates required vs optional variables with proper error handling
 */
const envSchema = z.object({
  // Node.js Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Application
  PORT: z.coerce.number().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),

  // Supabase - Required for core functionality
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message: 'NEXT_PUBLIC_SUPABASE_URL must be a valid URL'
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, {
    message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'
  }),

  // SendGrid - Required for email functionality
  SENDGRID_API_KEY: z.string().min(1, {
    message: 'SENDGRID_API_KEY is required for email functionality'
  }),
  SENDGRID_FROM_EMAIL: z.string().email({
    message: 'SENDGRID_FROM_EMAIL must be a valid email address'
  }).optional().default('updates@colinrodrigues.com'),
  SENDGRID_FROM_NAME: z.string().optional().default('Tribe'),

  // Linear API (Optional)
  LINEAR_API_KEY: z.string().optional(),
  LINEAR_PROJECT_ID: z.string().uuid({
    message: 'LINEAR_PROJECT_ID must be a valid UUID'
  }).optional(),

  // Database URL (Optional - used for direct DB operations)
  DATABASE_URL: z.string().url({
    message: 'DATABASE_URL must be a valid database URL'
  }).optional(),

  // Application URLs
  NEXT_PUBLIC_APP_URL: z.string().url({
    message: 'NEXT_PUBLIC_APP_URL must be a valid URL'
  }).optional().default('http://localhost:3000'),
})

// Type for validated environment
export type Env = z.infer<typeof envSchema>

// Validated environment instance
let validatedEnv: Env | null = null

/**
 * Validate environment variables with comprehensive error handling
 */
function validateEnvironment(): Env {
  try {
    const result = envSchema.safeParse(process.env)

    if (!result.success) {
      const errors = result.error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
        received: err.code === 'invalid_type' ? typeof (process.env as any)[err.path[0]] : 'invalid'
      }))

      logger.error('Environment validation failed', {
        errors,
        nodeEnv: process.env.NODE_ENV
      })

      // Create detailed error message
      const errorMessage = [
        '🚨 Environment Configuration Error 🚨',
        '',
        'The following environment variables are missing or invalid:',
        '',
        ...errors.map(err => `  • ${err.path}: ${err.message} (received: ${err.received})`),
        '',
        'Please check your .env.local file and ensure all required variables are properly configured.',
        '',
        'Required variables:',
        '  • NEXT_PUBLIC_SUPABASE_URL',
        '  • NEXT_PUBLIC_SUPABASE_ANON_KEY',
        '  • SENDGRID_API_KEY',
        '',
        'Optional variables with defaults:',
        '  • SENDGRID_FROM_EMAIL (default: updates@colinrodrigues.com)',
        '  • SENDGRID_FROM_NAME (default: Tribe)',
        '  • NEXT_PUBLIC_APP_URL (default: http://localhost:3000)',
        '  • NODE_ENV (default: development)',
        '  • PORT (default: 3000)',
      ].join('\n')

      throw new Error(errorMessage)
    }

    logger.info('Environment validation successful', {
      nodeEnv: result.data.NODE_ENV,
      hasSupabaseUrl: !!result.data.NEXT_PUBLIC_SUPABASE_URL,
      hasSendGridKey: !!result.data.SENDGRID_API_KEY,
      hasLinearKey: !!result.data.LINEAR_API_KEY,
      appUrl: result.data.NEXT_PUBLIC_APP_URL
    })

    return result.data
  } catch (error) {
    // Log error and re-throw for proper handling
    if (error instanceof Error && error.message.includes('Environment Configuration Error')) {
      throw error
    }

    logger.errorWithStack('Unexpected error during environment validation', error as Error)
    throw new Error('Failed to validate environment variables: ' + (error as Error).message)
  }
}

/**
 * Get validated environment variables
 * Validates on first call, returns cached result on subsequent calls
 */
export function getEnv(): Env {
  if (validatedEnv === null) {
    validatedEnv = validateEnvironment()
  }
  return validatedEnv
}

/**
 * Check if environment is properly configured without throwing
 * Useful for conditional features and graceful degradation
 */
export function checkEnvironmentHealth(): {
  isValid: boolean
  missingRequired: string[]
  missingOptional: string[]
  errors: string[]
} {
  const result = envSchema.safeParse(process.env)

  if (result.success) {
    return {
      isValid: true,
      missingRequired: [],
      missingOptional: [],
      errors: []
    }
  }

  const requiredFields = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SENDGRID_API_KEY'
  ]

  const optionalFields = [
    'SENDGRID_FROM_EMAIL',
    'SENDGRID_FROM_NAME',
    'LINEAR_API_KEY',
    'LINEAR_PROJECT_ID',
    'DATABASE_URL',
    'NEXT_PUBLIC_APP_URL',
    'LOG_LEVEL'
  ]

  const errors = result.error.errors
  const missingRequired: string[] = []
  const missingOptional: string[] = []
  const errorMessages: string[] = []

  for (const error of errors) {
    const field = error.path[0] as string
    const errorMsg = `${field}: ${error.message}`

    errorMessages.push(errorMsg)

    if (requiredFields.includes(field)) {
      missingRequired.push(field)
    } else if (optionalFields.includes(field)) {
      missingOptional.push(field)
    }
  }

  return {
    isValid: false,
    missingRequired,
    missingOptional,
    errors: errorMessages
  }
}

/**
 * Initialize environment validation on module load
 * This ensures environment validation happens at application startup
 */
export function initializeEnvironment(): void {
  try {
    const env = getEnv()

    // Log successful initialization
    logger.info('Environment initialized successfully', {
      nodeEnv: env.NODE_ENV,
      port: env.PORT,
      appUrl: env.NEXT_PUBLIC_APP_URL,
      features: {
        supabase: !!env.NEXT_PUBLIC_SUPABASE_URL,
        sendgrid: !!env.SENDGRID_API_KEY,
        linear: !!env.LINEAR_API_KEY
      }
    })

    // Warn about missing optional features
    if (!env.LINEAR_API_KEY) {
      logger.warn('Linear API integration not configured - LINEAR_API_KEY missing')
    }

    if (!env.DATABASE_URL) {
      logger.debug('Direct database URL not configured - using Supabase client only')
    }

  } catch (error) {
    logger.errorWithStack('Failed to initialize environment', error as Error)

    // In production, exit the process for critical errors
    if (process.env.NODE_ENV === 'production') {
      console.error('\n💥 Application failed to start due to environment configuration errors\n')
      process.exit(1)
    }

    // In development, log error but don't exit to allow for hot reloading
    throw error
  }
}

/**
 * Feature flags based on environment configuration
 */
export function getFeatureFlags(): {
  supabaseEnabled: boolean
  emailEnabled: boolean
  linearEnabled: boolean
  directDbEnabled: boolean
} {
  try {
    const env = getEnv()

    return {
      supabaseEnabled: !!(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      emailEnabled: !!env.SENDGRID_API_KEY,
      linearEnabled: !!(env.LINEAR_API_KEY && env.LINEAR_PROJECT_ID),
      directDbEnabled: !!env.DATABASE_URL
    }
  } catch {
    return {
      supabaseEnabled: false,
      emailEnabled: false,
      linearEnabled: false,
      directDbEnabled: false
    }
  }
}

/**
 * Development helper to check environment status
 */
export function getEnvironmentStatus(): {
  valid: boolean
  env: Env | null
  health: ReturnType<typeof checkEnvironmentHealth>
  features: ReturnType<typeof getFeatureFlags>
} {
  try {
    const env = getEnv()
    return {
      valid: true,
      env,
      health: checkEnvironmentHealth(),
      features: getFeatureFlags()
    }
  } catch {
    return {
      valid: false,
      env: null,
      health: checkEnvironmentHealth(),
      features: getFeatureFlags()
    }
  }
}

// Auto-initialize environment validation (with error handling for edge cases)
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  // Only auto-initialize on server side and outside of tests
  try {
    initializeEnvironment()
  } catch (error) {
    // Log but don't throw during module load to prevent import failures
    console.error('Environment validation failed during module initialization:', (error as Error).message)
  }
}