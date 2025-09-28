import { z } from 'zod'
import { createLogger } from './logger'

const logger = createLogger('env-validation')

interface PublicRuntimeConfig {
  [key: string]: string | undefined
}

interface NextData {
  props?: {
    pageProps?: {
      publicRuntimeConfig?: PublicRuntimeConfig
    }
  }
}

interface ExtendedWindow extends Omit<Window, '__NEXT_DATA__'> {
  __NEXT_DATA__?: NextData
  __ENV__?: Record<string, string | undefined>
}

function getExtendedWindow(): ExtendedWindow | null {
  if (typeof window === 'undefined') {
    return null
  }
  return window as ExtendedWindow
}

/**
 * Helper function to get expected Zod field type for detailed error logging
 */
function getZodFieldType(fieldName: string): string {
  const typeMap: Record<string, string> = {
    NODE_ENV: 'enum["development", "production", "test"]',
    PORT: 'number (1-65535)',
    LOG_LEVEL: 'enum["debug", "info", "warn", "error"] (optional)',
    NEXT_PUBLIC_SUPABASE_URL: 'url (required)',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'string (required, min length: 1)',
    SENDGRID_API_KEY: 'string (required, min length: 1)',
    SENDGRID_FROM_EMAIL: 'email (optional, default: updates@colinrodrigues.com)',
    SENDGRID_FROM_NAME: 'string (optional, default: Tribe)',
    LINEAR_API_KEY: 'string (optional)',
    LINEAR_PROJECT_ID: 'uuid (optional)',
    DATABASE_URL: 'url (optional)',
    NEXT_PUBLIC_APP_URL: 'url (optional, default: http://localhost:3000)'
  }
  return typeMap[fieldName] || 'unknown'
}

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

  // Twilio - Optional for SMS/WhatsApp functionality
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  TWILIO_WHATSAPP_NUMBER: z.string().optional(),

  // App Domain - Used for generating links in notifications
  APP_DOMAIN: z.string().optional().default('localhost:3000'),

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
    // Log the validation attempt with available environment variables (sanitized)
    const availableEnvVars = Object.keys(process.env).filter(key =>
      key.startsWith('NEXT_PUBLIC_') ||
      ['NODE_ENV', 'PORT', 'LOG_LEVEL'].includes(key)
    )

    logger.debug('Starting environment validation', {
      nodeEnv: process.env.NODE_ENV,
      availablePublicVars: availableEnvVars,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasSendgridKey: !!process.env.SENDGRID_API_KEY,
      hasLinearKey: !!process.env.LINEAR_API_KEY,
      supabaseUrlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      supabaseKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
      supabaseUrlPreview: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...' || 'undefined'
    })

    const result = envSchema.safeParse(process.env)

    if (!result.success) {
      // Enhanced error logging with detailed context
      const errors = result.error.errors.map(err => {
        const fieldName = err.path[0] as string
        const fieldValue = (process.env as Record<string, unknown>)[fieldName]

        return {
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
          received: err.code === 'invalid_type' ? typeof fieldValue : fieldValue,
          expectedType: getZodFieldType(err.path[0] as string),
          isPresent: fieldValue !== undefined,
          isEmpty: fieldValue === '' || fieldValue === null,
          length: typeof fieldValue === 'string' ? fieldValue.length : 0
        }
      })

      // Log detailed validation failure information
      logger.error('Environment validation failed - detailed breakdown', {
        totalErrors: errors.length,
        errors,
        nodeEnv: process.env.NODE_ENV,
        processEnvKeys: Object.keys(process.env).length,
        relevantEnvVars: {
          NEXT_PUBLIC_SUPABASE_URL: {
            present: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            length: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
            startsWithHttp: process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http') || false,
            preview: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 50) + '...' || 'undefined'
          },
          NEXT_PUBLIC_SUPABASE_ANON_KEY: {
            present: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            length: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
            startsWithEyJ: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith('eyJ') || false,
            preview: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...' || 'undefined'
          },
          SENDGRID_API_KEY: {
            present: !!process.env.SENDGRID_API_KEY,
            length: process.env.SENDGRID_API_KEY?.length || 0,
            startsWithSG: process.env.SENDGRID_API_KEY?.startsWith('SG.') || false
          },
          LINEAR_API_KEY: {
            present: !!process.env.LINEAR_API_KEY,
            length: process.env.LINEAR_API_KEY?.length || 0,
            startsWithLin: process.env.LINEAR_API_KEY?.startsWith('lin_') || false
          }
        }
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

    // Enhanced success logging
    logger.info('Environment validation successful - all variables validated', {
      nodeEnv: result.data.NODE_ENV,
      port: result.data.PORT,
      appUrl: result.data.NEXT_PUBLIC_APP_URL,
      validatedFields: {
        supabaseUrl: {
          present: !!result.data.NEXT_PUBLIC_SUPABASE_URL,
          isLocalhost: result.data.NEXT_PUBLIC_SUPABASE_URL.includes('localhost'),
          domain: new URL(result.data.NEXT_PUBLIC_SUPABASE_URL).hostname
        },
        supabaseKey: {
          present: !!result.data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          length: result.data.NEXT_PUBLIC_SUPABASE_ANON_KEY.length,
          isJWT: result.data.NEXT_PUBLIC_SUPABASE_ANON_KEY.startsWith('eyJ')
        },
        sendgridKey: {
          present: !!result.data.SENDGRID_API_KEY,
          length: result.data.SENDGRID_API_KEY.length,
          isValid: result.data.SENDGRID_API_KEY.startsWith('SG.')
        },
        sendgridFrom: {
          email: result.data.SENDGRID_FROM_EMAIL,
          name: result.data.SENDGRID_FROM_NAME
        },
        linearIntegration: {
          hasApiKey: !!result.data.LINEAR_API_KEY,
          hasProjectId: !!result.data.LINEAR_PROJECT_ID,
          enabled: !!(result.data.LINEAR_API_KEY && result.data.LINEAR_PROJECT_ID)
        },
        database: {
          hasDirectUrl: !!result.data.DATABASE_URL,
          isPostgresql: result.data.DATABASE_URL?.startsWith('postgresql://') || false
        }
      },
      totalValidatedFields: Object.keys(result.data).length
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
 * Client-side environment validation (only NEXT_PUBLIC_* variables)
 * Used by client components that don't need server-side variables
 *
 * Note: In Next.js 15, NEXT_PUBLIC_* variables are embedded in the client bundle at build time
 */
export function getClientEnv(): Pick<Env, 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY' | 'NEXT_PUBLIC_APP_URL' | 'NODE_ENV'> {
  // Get environment variables with multiple fallback strategies for production reliability
  function getEnvVar(key: string, defaultValue?: string): string | undefined {
    const strategies = []
    let finalValue: string | undefined

    // Strategy 1: Direct process.env access (works in dev and during build)
    const processEnvValue = process.env[key]
    strategies.push({
      strategy: 1,
      name: 'process.env',
      attempted: true,
      success: !!processEnvValue,
      value: processEnvValue ? `${processEnvValue.substring(0, 20)}...` : undefined,
      length: processEnvValue?.length || 0
    })

    if (processEnvValue) {
      finalValue = processEnvValue
      logger.debug(`Environment variable '${key}' found via process.env`, {
        strategy: 'process.env',
        hasValue: true,
        length: processEnvValue.length,
        preview: processEnvValue.substring(0, 30) + '...'
      })
    } else {
      // Strategy 2: Next.js publicRuntimeConfig (production fallback)
      let runtimeConfigValue: string | undefined
      const extendedWindow = getExtendedWindow()
      if (extendedWindow) {
        try {
          const publicRuntimeConfig = extendedWindow.__NEXT_DATA__?.props?.pageProps?.publicRuntimeConfig
          runtimeConfigValue = publicRuntimeConfig?.[key]
          strategies.push({
            strategy: 2,
            name: 'publicRuntimeConfig',
            attempted: true,
            success: !!runtimeConfigValue,
            value: runtimeConfigValue ? `${runtimeConfigValue.substring(0, 20)}...` : undefined,
            configAvailable: !!publicRuntimeConfig
          })

          if (runtimeConfigValue) {
            finalValue = runtimeConfigValue
            logger.debug(`Environment variable '${key}' found via publicRuntimeConfig`, {
              strategy: 'publicRuntimeConfig',
              hasValue: true,
              length: runtimeConfigValue.length
            })
          }
        } catch (error) {
          strategies.push({
            strategy: 2,
            name: 'publicRuntimeConfig',
            attempted: true,
            success: false,
            error: String(error)
          })
          logger.debug(`Unable to access runtime config for ${key}`, { error: String(error) })
        }
      } else {
        strategies.push({
          strategy: 2,
          name: 'publicRuntimeConfig',
          attempted: false,
          reason: 'window not available (SSR/build context)'
        })
      }

      // Strategy 3: Check if variables are embedded in window object (Vercel deployment)
      if (!finalValue && extendedWindow) {
        try {
          const env = extendedWindow.__ENV__
          const windowEnvValue = env?.[key]
          strategies.push({
            strategy: 3,
            name: 'window.__ENV__',
            attempted: true,
            success: !!windowEnvValue,
            value: windowEnvValue ? `${windowEnvValue.substring(0, 20)}...` : undefined,
            envObjectAvailable: !!env
          })

          if (windowEnvValue) {
            finalValue = windowEnvValue
            logger.debug(`Environment variable '${key}' found via window.__ENV__`, {
              strategy: 'window.__ENV__',
              hasValue: true,
              length: windowEnvValue.length
            })
          }
        } catch (error) {
          strategies.push({
            strategy: 3,
            name: 'window.__ENV__',
            attempted: true,
            success: false,
            error: String(error)
          })
          logger.debug(`Unable to access window.__ENV__ for ${key}`, { error: String(error) })
        }
      } else if (!finalValue) {
        strategies.push({
          strategy: 3,
          name: 'window.__ENV__',
          attempted: false,
          reason: extendedWindow ? 'already found value' : 'window not available (SSR/build context)'
        })
      }

      // Use default value if no strategy worked
      if (!finalValue && defaultValue) {
        finalValue = defaultValue
        logger.debug(`Environment variable '${key}' using default value`, {
          strategy: 'default',
          defaultValue: defaultValue.substring(0, 30) + '...',
          allStrategiesFailed: true
        })
      }
    }

    // Log comprehensive strategy results for debugging
    if (!finalValue || key.includes('SUPABASE')) {
      logger.debug(`Environment variable retrieval summary for '${key}'`, {
        key,
        finalValue: finalValue ? `${finalValue.substring(0, 20)}...` : undefined,
        hasValue: !!finalValue,
        length: finalValue?.length || 0,
        usedDefault: finalValue === defaultValue,
        strategiesAttempted: strategies.length,
        strategies,
        context: {
          isClient: typeof window !== 'undefined',
          isSSR: typeof window === 'undefined',
          nodeEnv: process.env.NODE_ENV
        }
      })
    }

    return finalValue
  }

  // Enhanced logging for client environment variable retrieval
  logger.debug('Client environment validation starting', {
    isClient: typeof window !== 'undefined',
    isSSR: typeof window === 'undefined',
    nodeEnv: process.env.NODE_ENV,
    hasPublicVars: {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      appUrl: !!process.env.NEXT_PUBLIC_APP_URL
    },
    publicVarLengths: {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
      appUrl: process.env.NEXT_PUBLIC_APP_URL?.length || 0
    }
  })

  // For client-side, access environment variables using fallback strategies
  const clientEnv = {
    NODE_ENV: getEnvVar('NODE_ENV', 'development'),
    NEXT_PUBLIC_SUPABASE_URL: getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    NEXT_PUBLIC_APP_URL: getEnvVar('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
  }

  // Log the retrieved values (sanitized)
  logger.debug('Client environment variables retrieved', {
    retrieved: {
      nodeEnv: clientEnv.NODE_ENV,
      hasSupabaseUrl: !!clientEnv.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasAppUrl: !!clientEnv.NEXT_PUBLIC_APP_URL,
      supabaseUrlPreview: clientEnv.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...' || 'undefined',
      supabaseKeyPreview: clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...' || 'undefined',
      appUrl: clientEnv.NEXT_PUBLIC_APP_URL
    },
    lengths: {
      supabaseUrl: clientEnv.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      supabaseKey: clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
      appUrl: clientEnv.NEXT_PUBLIC_APP_URL?.length || 0
    }
  })

  // Removed development fallbacks - all environments must have proper configuration
  // This ensures configuration issues are caught early rather than masked

  // Validate the client environment
  const clientSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url({
      message: 'NEXT_PUBLIC_SUPABASE_URL must be a valid URL'
    }),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, {
      message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'
    }),
    NEXT_PUBLIC_APP_URL: z.string().url({
      message: 'NEXT_PUBLIC_APP_URL must be a valid URL'
    }).optional().default('http://localhost:3000'),
  })

  try {
    const result = clientSchema.safeParse(clientEnv)

    if (!result.success) {
      const extendedWindowForLog = getExtendedWindow()
      const errors = result.error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
        received: err.code === 'invalid_type' ? typeof clientEnv[err.path[0] as keyof typeof clientEnv] : clientEnv[err.path[0] as keyof typeof clientEnv] || 'undefined'
      }))

      // Enhanced client-side validation failure logging
      logger.error('Client environment validation failed - detailed analysis', {
        validationStage: 'client-side-zod-validation',
        totalErrors: errors.length,
        errors: errors.map(err => ({
          ...err,
          fieldType: getZodFieldType(err.path),
          criticalField: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'].includes(err.path)
        })),
        context: {
          nodeEnv: clientEnv.NODE_ENV,
          isClient: typeof window !== 'undefined',
          isSSR: typeof window === 'undefined',
          isDevelopment: clientEnv.NODE_ENV === 'development',
          timestamp: new Date().toISOString()
        },
        environmentAnalysis: {
          processEnvKeys: typeof process !== 'undefined' ? Object.keys(process.env).length : 0,
          nextPublicVarsInProcess: typeof process !== 'undefined' ? Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')).length : 0,
          windowEnvAvailable: extendedWindowForLog ? !!extendedWindowForLog.__ENV__ : false,
          runtimeConfigAvailable: extendedWindowForLog ? !!extendedWindowForLog.__NEXT_DATA__?.props?.pageProps?.publicRuntimeConfig : false
        },
        retrievedValues: {
          supabaseUrl: {
            present: !!clientEnv.NEXT_PUBLIC_SUPABASE_URL,
            value: clientEnv.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...' || 'undefined',
            length: clientEnv.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
            isUrl: clientEnv.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http') || false
          },
          supabaseKey: {
            present: !!clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            value: clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...' || 'undefined',
            length: clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
            isJWT: clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith('eyJ') || false
          },
          appUrl: {
            present: !!clientEnv.NEXT_PUBLIC_APP_URL,
            value: clientEnv.NEXT_PUBLIC_APP_URL || 'undefined',
            isUrl: clientEnv.NEXT_PUBLIC_APP_URL?.startsWith('http') || false
          }
        }
      })

      // Removed all fallback configurations - fail fast in all environments
      // This ensures proper environment configuration is required everywhere

      const errorMessage = [
        '🚨 Client Environment Configuration Error 🚨',
        '',
        'The following client environment variables are missing or invalid:',
        '',
        ...errors.map(err => `  • ${err.path}: ${err.message} (received: ${err.received})`),
        '',
        'Required client variables:',
        '  • NEXT_PUBLIC_SUPABASE_URL',
        '  • NEXT_PUBLIC_SUPABASE_ANON_KEY',
        '',
        'Debug Information:',
        `  • NODE_ENV: ${clientEnv.NODE_ENV}`,
        `  • Build-time embedding: ${typeof window === 'undefined' ? 'build' : 'runtime'}`,
        '',
      ].join('\n')

      throw new Error(errorMessage)
    }

    logger.info('Client environment validation successful - all client variables validated', {
      validationStage: 'client-side-zod-success',
      nodeEnv: result.data.NODE_ENV,
      timestamp: new Date().toISOString(),
      context: {
        isClient: typeof window !== 'undefined',
        isSSR: typeof window === 'undefined'
      },
      validatedFields: {
        supabaseUrl: {
          present: !!result.data.NEXT_PUBLIC_SUPABASE_URL,
          domain: new URL(result.data.NEXT_PUBLIC_SUPABASE_URL).hostname,
          isLocalhost: result.data.NEXT_PUBLIC_SUPABASE_URL.includes('localhost'),
          length: result.data.NEXT_PUBLIC_SUPABASE_URL.length
        },
        supabaseKey: {
          present: !!result.data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          isJWT: result.data.NEXT_PUBLIC_SUPABASE_ANON_KEY.startsWith('eyJ'),
          length: result.data.NEXT_PUBLIC_SUPABASE_ANON_KEY.length,
          preview: result.data.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20) + '...'
        },
        appUrl: {
          present: !!result.data.NEXT_PUBLIC_APP_URL,
          value: result.data.NEXT_PUBLIC_APP_URL,
          isLocalhost: result.data.NEXT_PUBLIC_APP_URL.includes('localhost')
        }
      },
      integrationReadiness: {
        supabaseReady: !!(result.data.NEXT_PUBLIC_SUPABASE_URL && result.data.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        localDevelopment: result.data.NEXT_PUBLIC_SUPABASE_URL.includes('localhost'),
        productionReady: !result.data.NEXT_PUBLIC_SUPABASE_URL.includes('localhost') && result.data.NEXT_PUBLIC_SUPABASE_ANON_KEY.startsWith('eyJ')
      }
    })

    return result.data
  } catch (error) {
    if (error instanceof Error && error.message.includes('Client Environment Configuration Error')) {
      throw error
    }

    logger.errorWithStack('Unexpected error during client environment validation', error as Error)
    throw new Error('Failed to validate client environment variables: ' + (error as Error).message)
  }
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

    // Exit the process for critical errors in all environments (Node.js only)
    // This ensures configuration issues are caught immediately
    if (typeof process !== 'undefined' && process.exit) {
      logger.error('Application failed to start due to environment configuration errors', {
        nodeEnv: process.env.NODE_ENV,
        error: (error as Error).message,
        context: 'environment-initialization-failure'
      })
      // eslint-disable-next-line no-restricted-syntax
      process.exit(1)
    }

    // Re-throw the error to prevent application startup
    throw error
  }
}

/**
 * Feature flags based on environment configuration
 */
export function getFeatureFlags(): {
  supabaseEnabled: boolean
  emailEnabled: boolean
  smsEnabled: boolean
  whatsappEnabled: boolean
  linearEnabled: boolean
  directDbEnabled: boolean
} {
  // Remove try-catch fallback - if environment validation fails,
  // the application should fail rather than return false flags
  const env = getEnv()

  // Validate Supabase configuration more strictly
  const hasValidSupabase =
    env.NEXT_PUBLIC_SUPABASE_URL &&
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http') &&
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 50 &&
    // Reject development fallback values
    env.NEXT_PUBLIC_SUPABASE_URL !== 'http://localhost:54321' &&
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'development-fallback-key'

  return {
    supabaseEnabled: hasValidSupabase,
    emailEnabled: !!env.SENDGRID_API_KEY,
    smsEnabled: !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER),
    whatsappEnabled: !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && (env.TWILIO_WHATSAPP_NUMBER || env.TWILIO_PHONE_NUMBER)),
    linearEnabled: !!(env.LINEAR_API_KEY && env.LINEAR_PROJECT_ID),
    directDbEnabled: !!env.DATABASE_URL
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

/**
 * Comprehensive environment debugging function
 * Logs detailed information about environment variable state across all validation layers
 */
export function debugEnvironmentState(): void {
  const timestamp = new Date().toISOString()

  logger.info('=== COMPREHENSIVE ENVIRONMENT DEBUG REPORT ===', { timestamp })

  // 1. Raw Environment Inspection
  const rawEnvInfo = {
    totalProcessEnvKeys: typeof process !== 'undefined' ? Object.keys(process.env).length : 0,
    nodeEnv: process.env.NODE_ENV,
    nextPublicVars: typeof process !== 'undefined' ?
      Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')) : [],
    criticalVarsPresent: {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SENDGRID_API_KEY: !!process.env.SENDGRID_API_KEY,
      LINEAR_API_KEY: !!process.env.LINEAR_API_KEY
    },
    criticalVarsLengths: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
      SENDGRID_API_KEY: process.env.SENDGRID_API_KEY?.length || 0,
      LINEAR_API_KEY: process.env.LINEAR_API_KEY?.length || 0
    }
  }

  logger.info('1. Raw Environment Variables', rawEnvInfo)

  // 2. Server-side Validation Results
  try {
    const serverEnv = getEnv()
    logger.info('2. Server-side Validation: SUCCESS', {
      validatedFields: Object.keys(serverEnv).length,
      supabaseConfig: {
        url: serverEnv.NEXT_PUBLIC_SUPABASE_URL.substring(0, 50) + '...',
        keyLength: serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY.length,
        isProduction: !serverEnv.NEXT_PUBLIC_SUPABASE_URL.includes('localhost')
      },
      features: {
        sendgrid: !!serverEnv.SENDGRID_API_KEY,
        linear: !!(serverEnv.LINEAR_API_KEY && serverEnv.LINEAR_PROJECT_ID),
        database: !!serverEnv.DATABASE_URL
      }
    })
  } catch (error) {
    logger.error('2. Server-side Validation: FAILED', {
      error: (error as Error).message.substring(0, 200),
      validationLayer: 'server-side'
    })
  }

  // 3. Client-side Validation Results
  try {
    const clientEnv = getClientEnv()
    logger.info('3. Client-side Validation: SUCCESS', {
      context: {
        isClient: typeof window !== 'undefined',
        isSSR: typeof window === 'undefined'
      },
      clientFields: {
        nodeEnv: clientEnv.NODE_ENV,
        supabaseUrl: clientEnv.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 50) + '...',
        supabaseKeyLength: clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
        appUrl: clientEnv.NEXT_PUBLIC_APP_URL
      },
      integrationReadiness: {
        supabaseReady: !!(clientEnv.NEXT_PUBLIC_SUPABASE_URL && clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        isProduction: !clientEnv.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost')
      }
    })
  } catch (error) {
    logger.error('3. Client-side Validation: FAILED', {
      error: (error as Error).message.substring(0, 200),
      validationLayer: 'client-side'
    })
  }

  // 4. Health Check Results
  const health = checkEnvironmentHealth()
  logger.info('4. Environment Health Check', {
    isValid: health.isValid,
    missingRequired: health.missingRequired,
    missingOptional: health.missingOptional,
    totalErrors: health.errors.length,
    errors: health.errors.slice(0, 5) // Show first 5 errors
  })

  // 5. Feature Flags Status
  const features = getFeatureFlags()
  logger.info('5. Feature Flags', features)

  // 6. Runtime Context Information
  const extendedWindowInfo = getExtendedWindow()
  const runtimeInfo = {
    timestamp,
    nodeVersion: typeof process !== 'undefined' ? process.version : 'unknown',
    platform: typeof process !== 'undefined' ? process.platform : 'unknown',
    isNextjs: extendedWindowInfo ? !!extendedWindowInfo.__NEXT_DATA__ : 'unknown',
    hasWindowEnv: extendedWindowInfo ? !!extendedWindowInfo.__ENV__ : 'N/A',
    hasRuntimeConfig: extendedWindowInfo ?
      !!extendedWindowInfo.__NEXT_DATA__?.props?.pageProps?.publicRuntimeConfig : 'N/A'
  }

  logger.info('6. Runtime Context', runtimeInfo)

  logger.info('=== END ENVIRONMENT DEBUG REPORT ===', { timestamp })
}

/**
 * Quick environment validation check with minimal logging
 * Returns boolean result without throwing errors
 */
export function isEnvironmentValid(): boolean {
  try {
    getEnv()
    return true
  } catch {
    return false
  }
}

/**
 * Quick client environment validation check
 * Returns boolean result without throwing errors
 */
export function isClientEnvironmentValid(): boolean {
  try {
    getClientEnv()
    return true
  } catch {
    return false
  }
}

// Note: Auto-initialization removed to avoid Edge Runtime compatibility issues
// Environment validation will be performed on first call to getEnv()
