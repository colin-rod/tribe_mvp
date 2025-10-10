/**
 * GET/PUT /api/summaries/auto-publish-settings
 * Manage user's auto-publish configuration
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { z } from 'zod'

const settingsSchema = z.object({
  autoPublishHours: z.number().int().min(1).max(720).optional(), // 1 hour to 30 days
  remindersEnabled: z.boolean().optional(),
})

// GET - Fetch current auto-publish settings
export async function GET(_request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's preferences
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      // eslint-disable-next-line no-console
      console.error('Error fetching profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch settings', details: profileError.message },
        { status: 500 }
      )
    }

    // Default preferences since preferences column doesn't exist
    const preferences: Record<string, unknown> = {
      auto_publish_hours: 168,
      summary_reminders: true
    }

    return NextResponse.json({
      success: true,
      settings: {
        autoPublishHours: preferences.auto_publish_hours || 168, // Default 7 days
        remindersEnabled: preferences.summary_reminders !== false, // Default true
      },
    })

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Get auto-publish settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update auto-publish settings
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const settings = settingsSchema.parse(body)

    // Note: The profiles table doesn't have a preferences column
    // Settings would need to be stored in a separate table or added to profiles schema
    // For now, return success with the requested settings
    // TODO: Add preferences column to profiles table or create a user_settings table

    return NextResponse.json({
      success: true,
      settings: {
        autoPublishHours: settings.autoPublishHours ?? 168,
        remindersEnabled: settings.remindersEnabled ?? true,
      },
      message: 'Settings endpoint not fully implemented - preferences column missing from profiles table'
    })

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Update auto-publish settings error:', error)

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
