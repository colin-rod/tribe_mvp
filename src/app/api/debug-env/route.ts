import { NextResponse } from 'next/server'
import { getEnv, getClientEnv, checkEnvironmentHealth, getFeatureFlags } from '@/lib/env'

/**
 * Debug endpoint for comprehensive environment validation information
 * Returns detailed environment validation data directly in the response
 *
 * GET /api/debug-env - Returns comprehensive environment debug information
 */
export async function GET() {
  try {
    const timestamp = new Date().toISOString()
    const debugReport: any = {
      timestamp,
      status: 'success'
    }

    // 1. Raw Environment Inspection (server-side only, sanitized)
    debugReport.rawEnvironment = {
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
    try {
      const serverEnv = getEnv()
      debugReport.serverValidation = {
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
      debugReport.serverValidation = {
        status: 'FAILED',
        error: (error as Error).message.substring(0, 200)
      }
    }

    // 3. Client-side Validation Results (simulated server-side)
    try {
      const clientEnv = getClientEnv()
      debugReport.clientValidation = {
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
      debugReport.clientValidation = {
        status: 'FAILED',
        error: (error as Error).message.substring(0, 200)
      }
    }

    // 4. Health Check Results
    const health = checkEnvironmentHealth()
    debugReport.healthCheck = {
      isValid: health.isValid,
      missingRequired: health.missingRequired,
      missingOptional: health.missingOptional,
      totalErrors: health.errors.length,
      errors: health.errors
    }

    // 5. Feature Flags Status
    debugReport.featureFlags = getFeatureFlags()

    // 6. Runtime Context Information
    debugReport.runtimeContext = {
      timestamp,
      nodeVersion: process.version,
      platform: process.platform,
      environment: 'vercel-serverless',
      region: process.env.VERCEL_REGION || 'unknown'
    }

    // 7. Overall Status Assessment
    debugReport.overallStatus = {
      healthy: debugReport.serverValidation.status === 'SUCCESS' && debugReport.clientValidation.status === 'SUCCESS',
      serverValid: debugReport.serverValidation.status === 'SUCCESS',
      clientValid: debugReport.clientValidation.status === 'SUCCESS',
      allFeaturesEnabled: debugReport.featureFlags.supabaseEnabled && debugReport.featureFlags.emailEnabled,
      productionReady: debugReport.serverValidation?.supabaseConfig?.isProduction === true
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
}