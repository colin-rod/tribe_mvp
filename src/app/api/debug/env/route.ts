import { NextResponse } from 'next/server'

/**
 * Debug endpoint to verify environment variables in production
 * Only shows presence/absence, not actual values for security
 */
export async function GET() {
  // Only enable in development or when explicitly enabled
  const isDebugEnabled = process.env.NODE_ENV === 'development' || process.env.ENABLE_DEBUG === 'true'

  if (!isDebugEnabled) {
    return NextResponse.json({ error: 'Debug endpoint disabled in production' }, { status: 404 })
  }

  const envStatus = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    buildTime: typeof window === 'undefined',

    // Server-side environment variables
    serverEnv: {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasSendGridKey: !!process.env.SENDGRID_API_KEY,
      hasLinearKey: !!process.env.LINEAR_API_KEY,
      hasDatabaseUrl: !!process.env.DATABASE_URL,

      // Show first few characters for verification (development only)
      ...(process.env.NODE_ENV === 'development' && {
        supabaseUrlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20),
        supabaseKeyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20),
      })
    },

    // Client-side environment variables (what gets embedded)
    clientEnv: {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
      hasSiteUrl: !!process.env.NEXT_PUBLIC_SITE_URL,
    },

    // Environment file detection
    envFiles: {
      nodeEnv: process.env.NODE_ENV,
      // These would be set differently based on which .env files are loaded
      development: process.env.NODE_ENV === 'development',
      production: process.env.NODE_ENV === 'production',
    }
  }

  return NextResponse.json(envStatus, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    }
  })
}