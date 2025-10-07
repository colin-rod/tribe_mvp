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
      .select('preferences')
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

    const preferences = (profile?.preferences as Record<string, unknown>) || {}

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

    // Get current preferences
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', user.id)
      .single()

    if (fetchError) {
      // eslint-disable-next-line no-console
      console.error('Error fetching profile:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch current settings', details: fetchError.message },
        { status: 500 }
      )
    }

    const currentPreferences = (profile?.preferences as Record<string, unknown>) || {}

    // Build updated preferences
    const updatedPreferences: Record<string, unknown> = {
      ...currentPreferences,
    }

    if (settings.autoPublishHours !== undefined) {
      updatedPreferences.auto_publish_hours = settings.autoPublishHours
    }

    if (settings.remindersEnabled !== undefined) {
      updatedPreferences.summary_reminders = settings.remindersEnabled
    }

    // Update preferences
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        preferences: updatedPreferences,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('preferences')
      .single()

    if (updateError) {
      // eslint-disable-next-line no-console
      console.error('Error updating settings:', updateError)
      return NextResponse.json(
        { error: 'Failed to update settings', details: updateError.message },
        { status: 500 }
      )
    }

    const finalPreferences = (updatedProfile?.preferences as Record<string, unknown>) || {}

    return NextResponse.json({
      success: true,
      settings: {
        autoPublishHours: finalPreferences.auto_publish_hours || 168,
        remindersEnabled: finalPreferences.summary_reminders !== false,
      },
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
