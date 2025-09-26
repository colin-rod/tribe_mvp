import { NextRequest, NextResponse } from 'next/server'
import { getEnv, getClientEnv, checkEnvironmentHealth, getFeatureFlags } from '@/lib/env'
import { withSecurity, SecurityConfigs } from '@/lib/middleware/security'

type RawEnvironmentSummary = {
  nodeEnv: string | undefined
  totalEnvVars: number
  nextPublicVars: string[]
  criticalVarsPresent: Record<string, boolean>
  criticalVarsLengths: Record<string, number>
  supabaseUrlPreview: string
}

type ServerValidationSuccess = {
  status: 'SUCCESS'
  validatedFields: number
  supabaseConfig: {
    url: string
    keyLength: number
    isProduction: boolean
    domain: string
  }
  features: {
    sendgrid: boolean
    linear: boolean
    database: boolean
  }
  allFields: {
    nodeEnv: string
    port: number
    appUrl?: string
    sendgridFromEmail?: string
    sendgridFromName?: string
    hasLinearProjectId: boolean
  }
}

type ServerValidationFailure = {
  status: 'FAILED'
  error: string
}

type ServerValidationResult = ServerValidationSuccess | ServerValidationFailure

type ClientValidationSuccess = {
  status: 'SUCCESS'
  context: {
    isSSR: boolean
    nodeEnv: string | undefined
  }
  clientFields: {
    supabaseUrl: string
    supabaseUrlLength: number
    supabaseKeyLength: number
    appUrl?: string
    supabaseDomain: string
  }
  integrationReadiness: {
    supabaseReady: boolean
    isProduction: boolean
    isValidJWT: boolean
  }
}

type ClientValidationFailure = {
  status: 'FAILED'
  error: string
}

type ClientValidationResult = ClientValidationSuccess | ClientValidationFailure

type FeatureFlags = ReturnType<typeof getFeatureFlags>
type HealthCheck = ReturnType<typeof checkEnvironmentHealth>
type AugmentedHealthCheck = HealthCheck & { totalErrors: number }

type RuntimeContext = {
  timestamp: string
  nodeVersion: string
  platform: NodeJS.Platform
  environment: string
  region: string
}

type OverallStatus = {
  healthy: boolean
  serverValid: boolean
  clientValid: boolean
  allFeaturesEnabled: boolean
  productionReady: boolean
}

type DebugReport = {
  timestamp: string
  status: 'success'
  rawEnvironment: RawEnvironmentSummary
  serverValidation: ServerValidationResult
  clientValidation: ClientValidationResult
  healthCheck: AugmentedHealthCheck
  featureFlags: FeatureFlags
  runtimeContext: RuntimeContext
  overallStatus: OverallStatus
}

/**
 * Debug endpoint for comprehensive environment validation information
 * Returns detailed environment validation data directly in the response
 *
 * GET /api/debug-env - Returns comprehensive environment debug information
 */
export const GET = withSecurity(SecurityConfigs.debug)(async (_request: NextRequest) => {
  try {
    const timestamp = new Date().toISOString()
    const rawEnvironment: RawEnvironmentSummary = {
      nodeEnv: process.env.NODE_ENV,
      totalEnvVars: Object.keys(process.env).length,
      nextPublicVars: Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')),
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
      },
      supabaseUrlPreview: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 50) + '...' || 'undefined'
    }

    // 2. Server-side Validation Results
    let serverValidation: ServerValidationResult
    try {
      const serverEnv = getEnv()
      serverValidation = {
        status: 'SUCCESS',
        validatedFields: Object.keys(serverEnv).length,
        supabaseConfig: {
          url: serverEnv.NEXT_PUBLIC_SUPABASE_URL.substring(0, 50) + '...',
          keyLength: serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY.length,
          isProduction: !serverEnv.NEXT_PUBLIC_SUPABASE_URL.includes('localhost'),
          domain: new URL(serverEnv.NEXT_PUBLIC_SUPABASE_URL).hostname
        },
        features: {
          sendgrid: !!serverEnv.SENDGRID_API_KEY,
          linear: !!(serverEnv.LINEAR_API_KEY && serverEnv.LINEAR_PROJECT_ID),
          database: !!serverEnv.DATABASE_URL
        },
        allFields: {
          nodeEnv: serverEnv.NODE_ENV,
          port: serverEnv.PORT,
          appUrl: serverEnv.NEXT_PUBLIC_APP_URL,
          sendgridFromEmail: serverEnv.SENDGRID_FROM_EMAIL,
          sendgridFromName: serverEnv.SENDGRID_FROM_NAME,
          hasLinearProjectId: !!serverEnv.LINEAR_PROJECT_ID
        }
      }
    } catch (error) {
      serverValidation = {
        status: 'FAILED',
        error: (error as Error).message.substring(0, 200)
      }
    }

    // 3. Client-side Validation Results (simulated server-side)
    let clientValidation: ClientValidationResult
    try {
      const clientEnv = getClientEnv()
      clientValidation = {
        status: 'SUCCESS',
        context: {
          isSSR: true, // This endpoint runs server-side
          nodeEnv: clientEnv.NODE_ENV
        },
        clientFields: {
          supabaseUrl: clientEnv.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 50) + '...',
          supabaseUrlLength: clientEnv.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
          supabaseKeyLength: clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
          appUrl: clientEnv.NEXT_PUBLIC_APP_URL,
          supabaseDomain: new URL(clientEnv.NEXT_PUBLIC_SUPABASE_URL).hostname
        },
        integrationReadiness: {
          supabaseReady: !!(clientEnv.NEXT_PUBLIC_SUPABASE_URL && clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY),
          isProduction: !clientEnv.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost'),
          isValidJWT: clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith('eyJ') || false
        }
      }
    } catch (error) {
      clientValidation = {
        status: 'FAILED',
        error: (error as Error).message.substring(0, 200)
      }
    }

    // 4. Health Check Results
    const health = checkEnvironmentHealth()
    const healthCheck: AugmentedHealthCheck = {
      ...health,
      totalErrors: health.errors.length
    }

    // 5. Feature Flags Status
    const featureFlags = getFeatureFlags()

    // 6. Runtime Context Information
    const runtimeContext: RuntimeContext = {
      timestamp,
      nodeVersion: process.version,
      platform: process.platform,
      environment: 'vercel-serverless',
      region: process.env.VERCEL_REGION || 'unknown'
    }

    // 7. Overall Status Assessment
    const overallStatus: OverallStatus = {
      healthy: serverValidation.status === 'SUCCESS' && clientValidation.status === 'SUCCESS',
      serverValid: serverValidation.status === 'SUCCESS',
      clientValid: clientValidation.status === 'SUCCESS',
      allFeaturesEnabled: featureFlags.supabaseEnabled && featureFlags.emailEnabled,
      productionReady: serverValidation.status === 'SUCCESS'
        ? serverValidation.supabaseConfig.isProduction
        : false
    }

    const debugReport: DebugReport = {
      timestamp,
      status: 'success',
      rawEnvironment,
      serverValidation,
      clientValidation,
      healthCheck,
      featureFlags,
      runtimeContext,
      overallStatus
    }

    return NextResponse.json(debugReport, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })

  } catch (error) {
    return NextResponse.json({
      message: 'Error generating environment debug report',
      status: 'error',
      error: (error as Error).message,
      stack: (error as Error).stack?.substring(0, 500),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
})
