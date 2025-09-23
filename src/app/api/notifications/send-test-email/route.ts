import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { serverEmailService } from '@/lib/services/serverEmailService'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'

const logger = createLogger('NotificationTestEmailAPI')

const sendTestEmailSchema = z.object({
  to: z.string().email('Invalid email address'),
  type: z.enum(['response', 'prompt', 'digest', 'system']).optional().default('system')
})

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const validatedData = sendTestEmailSchema.parse(body)

    // Check authentication
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if email service is configured
    if (!serverEmailService.isConfigured()) {
      return NextResponse.json(
        { error: 'Email service not properly configured' },
        { status: 500 }
      )
    }

    // Send the test email
    const result = await serverEmailService.sendTestEmail(
      validatedData.to,
      validatedData.type
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send test email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      statusCode: result.statusCode,
      message: `Test ${validatedData.type} email sent successfully`
    })

  } catch (error) {
    logger.errorWithStack('Send test email API error', error as Error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}