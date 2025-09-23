import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { serverEmailService } from '@/lib/services/serverEmailService'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
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

    // Get email service status
    const status = serverEmailService.getStatus()

    return NextResponse.json({
      configured: status.configured,
      apiKey: status.apiKey,
      fromEmail: status.fromEmail,
      service: 'SendGrid',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Email service status API error:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}