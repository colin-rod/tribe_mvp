import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { serverEmailService } from '@/lib/services/serverEmailService'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'

const logger = createLogger('NotificationBulkEmailAPI')

const bulkEmailSchema = z.object({
  emails: z.array(z.object({
    to: z.string().email('Invalid email address'),
    type: z.enum(['response', 'prompt', 'digest', 'system', 'preference']),
    templateData: z.record(z.any()).optional(),
    options: z.object({
      from: z.string().email().optional(),
      fromName: z.string().optional(),
      replyTo: z.string().email().optional(),
      categories: z.array(z.string()).optional(),
      customArgs: z.record(z.string()).optional()
    }).optional()
  })).min(1, 'At least one email required').max(100, 'Maximum 100 emails per request')
})

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const validatedData = bulkEmailSchema.parse(body)

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

    // Convert to email options format
    const _emailOptions = validatedData.emails.map(emailData => {
      const _template = serverEmailService.getEmailTemplate?.(emailData.type, emailData.templateData || {})

      // Since getEmailTemplate is private, we'll use sendTemplatedEmail for each
      return {
        to: emailData.to,
        subject: '', // Will be set by template
        html: '', // Will be set by template
        text: '', // Will be set by template
        categories: emailData.options?.categories || [`tribe-${emailData.type}`, 'tribe-notification'],
        customArgs: {
          templateType: emailData.type,
          ...emailData.options?.customArgs
        },
        ...emailData.options
      }
    })

    // Send emails in batches using the individual email method
    const results = []
    for (const emailData of validatedData.emails) {
      try {
        const result = await serverEmailService.sendTemplatedEmail(
          emailData.to,
          emailData.type,
          emailData.templateData || {},
          emailData.options || {}
        )
        results.push({
          to: emailData.to,
          success: result.success,
          messageId: result.messageId,
          error: result.error
        })
      } catch (error) {
        results.push({
          to: emailData.to,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.length - successCount

    return NextResponse.json({
      success: failureCount === 0,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount
      }
    })

  } catch (error) {
    logger.errorWithStack('Send bulk emails API error', error as Error)

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