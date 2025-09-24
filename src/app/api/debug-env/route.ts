import { NextResponse } from 'next/server'
import { debugEnvironmentState, isEnvironmentValid, isClientEnvironmentValid } from '@/lib/env'

/**
 * Debug endpoint for comprehensive environment validation logging
 * This endpoint triggers detailed logging for environment troubleshooting
 *
 * GET /api/debug-env - Triggers comprehensive environment debug report
 */
export async function GET() {
  try {
    // Trigger comprehensive environment debugging
    debugEnvironmentState()

    // Get quick validation status
    const serverValid = isEnvironmentValid()
    const clientValid = isClientEnvironmentValid()

    return NextResponse.json({
      message: 'Environment debug report generated - check server logs',
      status: 'success',
      timestamp: new Date().toISOString(),
      quickStatus: {
        serverValidation: serverValid,
        clientValidation: clientValid,
        overallHealthy: serverValid && clientValid
      },
      note: 'Detailed information has been logged to the console. Check your development server output for the comprehensive environment debug report.'
    })

  } catch (error) {
    return NextResponse.json({
      message: 'Error generating environment debug report',
      status: 'error',
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}